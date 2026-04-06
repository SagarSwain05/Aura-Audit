const Company = require('../models/Company');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Student = require('../models/Student');
const axios = require('axios');
const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

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

  const [jobs, recentApps] = await Promise.all([
    Job.find({ company: company._id }).select('title status applicationsCount views createdAt'),
    JobApplication.find({ company: company._id })
      .sort({ appliedAt: -1 }).limit(10)
      .populate('student', 'name email careerReadinessScore')
      .populate('job', 'title'),
  ]);

  const stats = {
    activeJobs: jobs.filter(j => j.status === 'active').length,
    draftJobs: jobs.filter(j => j.status === 'draft').length,
    totalApplications: jobs.reduce((s, j) => s + j.applicationsCount, 0),
    shortlisted: await JobApplication.countDocuments({ company: company._id, status: 'shortlisted' }),
    interviews: await JobApplication.countDocuments({ company: company._id, status: 'interview_scheduled' }),
    selected: await JobApplication.countDocuments({ company: company._id, status: 'selected' }),
  };

  res.json({ company, stats, jobs, recentApplications: recentApps });
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

// POST /api/company/candidates/match  — AI match for a specific job
exports.matchCandidates = async (req, res) => {
  const { jobId } = req.body;
  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  // Get all students and score them
  const students = await Student.find({ 'skills.0': { $exists: true } })
    .select('name email skills cgpa department careerReadinessScore');

  const results = students.map(student => {
    const studentSkills = student.skills.map(s => s.name.toLowerCase());
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const matched = jobSkills.filter(s => studentSkills.includes(s));
    const score = Math.round((matched.length / Math.max(jobSkills.length, 1)) * 70 + (student.cgpa / 10) * 30);
    return { student, matchScore: score, matchedSkills: matched, missingSkills: job.skills.filter(s => !studentSkills.includes(s.toLowerCase())) };
  })
  .filter(r => r.matchScore >= 30)
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, 20);

  res.json({ matches: results });
};

// POST /api/company/kyc  — upload KYC doc URL
exports.uploadKYC = async (req, res) => {
  const { docType, url } = req.body;
  const company = await Company.findOne({ userId: req.user._id });
  company.kycDocuments.push({ docType, url, status: 'pending' });
  await company.save();
  res.json({ kycDocuments: company.kycDocuments });
};
