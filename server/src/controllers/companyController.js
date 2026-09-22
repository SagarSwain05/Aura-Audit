const Company = require('../models/Company');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const axios = require('axios');
const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

const READINESS_LABEL = (score) =>
  score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_growth';

// GET /api/company/profile
exports.getProfile = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  if (!company) return res.status(404).json({ message: 'Company profile not found' });
  res.json({ company });
};

// PUT /api/company/profile
exports.updateProfile = async (req, res) => {
  const fields = ['name','industry','website','location','about','size','foundedYear','logo','phone','socialLinks'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const company = await Company.findOneAndUpdate({ userId: req.user._id }, updates, { new: true });
  res.json({ company });
};

// GET /api/company/dashboard
exports.getDashboard = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  if (!company) return res.status(404).json({ message: 'Not found' });

  // company.stats (the model sub-document) is a cached counter that's never
  // actually kept in sync — createJob bumps activeJobs regardless of the
  // job's real status and never decrements it, and totalApplications/
  // totalHired are never touched anywhere. The home and analytics pages
  // used to read that stale field. Compute everything live here instead —
  // this dataset is small enough that a live count is cheap and correct.
  const [jobs, allApps, recentApps] = await Promise.all([
    Job.find({ company: company._id }).select('title status applicationsCount views createdAt'),
    JobApplication.find({ company: company._id }).select('status appliedAt createdAt'),
    JobApplication.find({ company: company._id })
      .sort({ appliedAt: -1 }).limit(10)
      .populate('student', 'name email careerReadinessScore')
      .populate('job', 'title'),
  ]);

  const applicationsByStatus = allApps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // Last 6 months, oldest first, zero-filled so the chart doesn't skip gaps.
  const monthlyApplications = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
    const count = allApps.filter((a) => {
      const applied = new Date(a.appliedAt || a.createdAt);
      return applied.getFullYear() === d.getFullYear() && applied.getMonth() === d.getMonth();
    }).length;
    monthlyApplications.push({ month: monthLabel, count });
  }

  const stats = {
    activeJobs: jobs.filter(j => j.status === 'active').length,
    draftJobs: jobs.filter(j => j.status === 'draft').length,
    totalApplications: allApps.length,
    shortlisted: applicationsByStatus.shortlisted || 0,
    interviews: applicationsByStatus.interview_scheduled || 0,
    selected: applicationsByStatus.selected || 0,
    totalHired: applicationsByStatus.selected || 0,
  };

  res.json({ company, stats, jobs, recentApplications: recentApps, applicationsByStatus, monthlyApplications });
};

// GET /api/company/candidates  (AI-powered search)
exports.searchCandidates = async (req, res) => {
  const { skills, minCgpa, department, location, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (minCgpa) filter.cgpa = { $gte: Number(minCgpa) };
  if (department) filter.department = new RegExp(department, 'i');
  if (location) filter.location = new RegExp(location, 'i');
  if (skills) {
    const skillArr = skills.split(',').map(s => s.trim());
    filter['skills.name'] = { $in: skillArr.map(s => new RegExp(s, 'i')) };
  }

  const students = await Student.find(filter)
    .select('name email skills cgpa department careerReadinessScore badges isPlaced')
    .sort({ careerReadinessScore: -1 })
    .skip((page - 1) * limit).limit(Number(limit));

  const total = await Student.countDocuments(filter);
  res.json({ candidates: students, total });
};

// POST /api/company/candidates/match  — AI match for a specific job, ranked
// by fit against that role AND overall career readiness (skills + CGPA
// weighting below, career readiness surfaced separately as a "readiness"
// label so a recruiter can see both "fits THIS role" and "generally job
// ready" — they aren't always the same candidate).
exports.matchCandidates = async (req, res) => {
  const { jobId, minScore = 30, limit = 20 } = req.body;
  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  const students = await Student.find({ 'skills.0': { $exists: true } })
    .select('name email skills cgpa department careerReadinessScore isPlaced dreamRole');

  const results = students.map((student) => {
    const studentSkills = student.skills.map((s) => s.name.toLowerCase());
    const jobSkills = job.skills.map((s) => s.toLowerCase());
    const matched = jobSkills.filter((s) => studentSkills.includes(s));
    const score = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 70 + (student.cgpa / 10) * 30);
    return {
      // Flattened (not nested under `student`) so the frontend renders name/
      // skills/cgpa directly — this used to be nested as { student, ... },
      // which silently rendered every field as blank since nothing read it.
      ...student.toObject(),
      matchScore: score,
      matchedSkills: matched,
      missingSkills: job.skills.filter((s) => !studentSkills.includes(s.toLowerCase())),
      readiness: READINESS_LABEL(student.careerReadinessScore || 0),
    };
  })
    .filter((r) => r.matchScore >= Number(minScore))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Number(limit));

  res.json({ matches: results, job: { _id: job._id, title: job.title, skills: job.skills } });
};

// POST /api/company/candidates/source — add an AI-matched candidate directly
// into a job's pipeline without waiting for them to apply themselves. Lets
// the Hiring Pipeline surface strong-fit candidates sourced from the whole
// portal, not just whoever happened to apply.
exports.sourceCandidate = async (req, res) => {
  const { jobId, studentId } = req.body;
  const company = await Company.findOne({ userId: req.user._id });
  const job = await Job.findOne({ _id: jobId, company: company._id });
  if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });

  const student = await Student.findById(studentId);
  if (!student) return res.status(404).json({ message: 'Candidate not found' });

  const existing = await JobApplication.findOne({ student: student._id, job: job._id });
  if (existing) return res.status(409).json({ message: 'Already in this job\'s pipeline' });

  const studentSkills = student.skills.map((s) => s.name.toLowerCase());
  const jobSkills = job.skills.map((s) => s.toLowerCase());
  const matched = jobSkills.filter((s) => studentSkills.includes(s));
  const matchScore = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 70 + (student.cgpa / 10) * 30);

  const application = await JobApplication.create({
    student: student._id,
    job: job._id,
    company: company._id,
    resumeUrl: student.resume?.url,
    matchScore,
    notes: 'Sourced by recruiter from AI candidate matching.',
  });

  const studentUser = await require('../models/User').findById(student.userId);
  if (studentUser) {
    const notif = await Notification.create({
      user: studentUser._id,
      type: 'application_update',
      title: `${company.name} is interested in your profile`,
      message: `You've been added to the pipeline for "${job.title}" based on your skill match — no action needed, they'll reach out if it's a fit.`,
      link: '/student/jobs',
    });
    if (global.emitToUser) global.emitToUser(studentUser._id.toString(), 'notification', notif);
  }

  res.status(201).json({ application });
};

// POST /api/company/kyc  — upload KYC doc URL
exports.uploadKYC = async (req, res) => {
  const { docType, url } = req.body;
  const company = await Company.findOne({ userId: req.user._id });
  company.kycDocuments.push({ docType, url, status: 'pending' });
  await company.save();
  res.json({ kycDocuments: company.kycDocuments });
};
