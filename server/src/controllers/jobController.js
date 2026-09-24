const axios = require('axios');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Company = require('../models/Company');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { makeFallbackLiveJobs } = require('../utils/aiFallbacks');
const { JOB_ROLE_CATALOG } = require('../data/jobRoleCatalog');
const { LOCATION_CATALOG } = require('../data/locationCatalog');
const { CATALOG: SKILL_CATALOG } = require('../data/skillCatalog');

// GET /api/jobs/catalog/roles
exports.getJobRoleCatalog = async (req, res) => {
  res.json({ catalog: JOB_ROLE_CATALOG });
};

// GET /api/jobs/catalog/locations
exports.getLocationCatalog = async (req, res) => {
  res.json({ catalog: LOCATION_CATALOG });
};

// GET /api/jobs/catalog/skills — same canonical skill catalog students pick
// from when adding skills to their profile (server/src/data/skillCatalog.js),
// exposed here too since that route is student-role-locked and companies
// need it for the "Required Skills" picker on job postings.
exports.getSkillCatalog = async (req, res) => {
  res.json({ catalog: SKILL_CATALOG });
};

const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// GET /api/jobs  (public with filters)
exports.getJobs = async (req, res) => {
  const { q, type, location, jobType, status = 'active', page = 1, limit = 20 } = req.query;
  const filter = { status };
  if (q) filter.$text = { $search: q };
  if (type) filter.type = type;
  if (location) filter.location = new RegExp(location, 'i');
  if (jobType) filter.jobType = jobType;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('company', 'name logo location industry isVerified')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    Job.countDocuments(filter),
  ]);
  res.json({ jobs, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// GET /api/jobs/:id
exports.getJobById = async (req, res) => {
  const job = await Job.findByIdAndUpdate(
    req.params.id, { $inc: { views: 1 } }, { new: true }
  ).populate('company', 'name logo location industry about website isVerified');
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json({ job });
};

// POST /api/jobs  (company only)
exports.createJob = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  if (!company) return res.status(403).json({ message: 'Company profile required' });

  const job = await Job.create({ ...req.body, company: company._id });

  // Index in vector store for semantic search
  axios.post(`${AI}/api/v1/jobs/index`, {
    job_id: job._id.toString(),
    title: job.title,
    skills: job.skills,
    description: job.description,
    requirements: job.requirements,
    company: company.name,
    location: job.location,
    job_type: job.jobType,
    salary: job.salary,
  }).catch(() => {}); // Non-blocking

  company.stats.activeJobs += 1;
  await company.save();
  res.status(201).json({ job });
};

// PUT /api/jobs/:id
exports.updateJob = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, company: company._id },
    req.body,
    { new: true }
  );
  if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
  res.json({ job });
};

// DELETE /api/jobs/:id
exports.deleteJob = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  const job = await Job.findOneAndDelete({ _id: req.params.id, company: company._id });
  if (!job) return res.status(404).json({ message: 'Not found' });
  // Otherwise these orphan — invisible in the Pipeline's job dropdown (which
  // only lists still-existing jobs) but still sitting in the DB forever.
  await JobApplication.deleteMany({ job: job._id });
  axios.delete(`${AI}/api/v1/jobs/index/${req.params.id}`).catch(() => {});
  res.json({ message: 'Deleted' });
};

// POST /api/jobs/:id/apply
exports.applyJob = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(403).json({ message: 'Student profile required' });

  const job = await Job.findById(req.params.id);
  if (!job || job.status !== 'active') return res.status(400).json({ message: 'Job not available' });

  const existing = await JobApplication.findOne({ student: student._id, job: job._id });
  if (existing) return res.status(409).json({ message: 'Already applied' });

  // Get match score
  let matchScore = 0;
  try {
    const matchRes = await axios.post(`${AI}/api/v1/jobs/match`, {
      skills: student.skills.map(s => ({ name: s.name, level: s.level })),
      cgpa: student.cgpa,
      min_score: 0,
      limit: 1,
    });
    const matches = matchRes.data.matches || [];
    const m = matches.find(m => m.job_id === job._id.toString());
    matchScore = m?.match_score || 0;
  } catch {}

  const application = await JobApplication.create({
    student: student._id,
    job: job._id,
    company: job.company,
    resumeUrl: req.body.resumeUrl || student.resume?.url,
    coverLetter: req.body.coverLetter,
    matchScore,
  });

  await Promise.all([
    Job.findByIdAndUpdate(job._id, { $inc: { applicationsCount: 1 } }),
    Student.findByIdAndUpdate(student._id, { $inc: { 'activityStats.jobsApplied': 1 }, $min: { 'careerPoints.total': 0 } }),
    student.addCareerPoints(5, `Applied to ${job.title}`),
  ]);

  res.status(201).json({ application });
};

// GET /api/jobs/my-applications  (student)
exports.getMyApplications = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.json({ applications: [] });
  const applications = await JobApplication.find({ student: student._id })
    .populate('job', 'title location type salary')
    .populate('company', 'name logo')
    .sort({ appliedAt: -1 });
  res.json({ applications });
};

// GET /api/jobs/:id/applications  (company)
exports.getJobApplications = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  const job = await Job.findOne({ _id: req.params.id, company: company._id });
  if (!job) return res.status(403).json({ message: 'Unauthorized' });

  const applications = await JobApplication.find({ job: job._id })
    .populate('student', 'name email skills cgpa careerReadinessScore')
    .sort({ matchScore: -1 });
  res.json({ applications });
};

// PUT /api/jobs/applications/:id/status  (company)
exports.updateApplicationStatus = async (req, res) => {
  const { status, notes, interviewDate } = req.body;
  const application = await JobApplication.findByIdAndUpdate(
    req.params.id,
    { status, notes, ...(interviewDate && { interviewDate }) },
    { new: true }
  ).populate('student');

  if (!application) return res.status(404).json({ message: 'Not found' });

  // Notify student
  const msgs = {
    shortlisted: 'Congratulations! You have been shortlisted.',
    interview_scheduled: `Interview scheduled for ${interviewDate ? new Date(interviewDate).toLocaleDateString() : 'soon'}.`,
    selected: 'You have been selected! Check your offer details.',
    rejected: 'Thank you for applying. Unfortunately this time it did not work out.',
  };
  if (msgs[status]) {
    const studentUser = await require('../models/User').findById(application.student.userId);
    if (studentUser) {
      const notif = await Notification.create({
        user: studentUser._id,
        type: 'application_update',
        title: 'Application Update',
        message: msgs[status],
        link: '/student/jobs',
      });
      // This only wrote the DB row before — no live push, so a status
      // change never actually reached the student in real time, only on
      // their next full reload/poll of notifications.
      if (global.emitToUser) global.emitToUser(studentUser._id.toString(), 'notification', notif);
    }
  }

  res.json({ application });
};

// GET /api/jobs/live  (student — real-time SerpApi Google Jobs)
exports.getLiveJobs = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student profile required' });

  const { location: queryLocation, num_jobs = 10, role } = req.query;

  // Forward user-provided Gemini key if present
  const userGeminiKey = req.headers['x-user-gemini-key'] || '';
  const aiHeaders = userGeminiKey ? { 'x-user-gemini-key': userGeminiKey } : {};

  // Use user-supplied role override OR student's dream role
  const dreamRole = role || student.dreamRole || '';
  // Prefer an explicit location typed by the user this request, then the
  // profile's saved location (which the resume audit auto-fills if it was
  // never manually set), and only fall back to a generic default last.
  const location = queryLocation || student.location || 'India';
  // Project titles give the query-builder real context beyond a bare skill
  // list — this field existed on the AI-engine side but was never actually
  // populated from here before.
  const experienceTitles = (student.projects || []).map(p => p.title).filter(Boolean).slice(0, 5);

  try {
    const aiRes = await axios.post(`${AI}/api/v1/jobs/live`, {
      skills: student.skills.map(s => s.name),
      dream_role: dreamRole,
      location,
      experience_titles: experienceTitles,
      num_jobs: Math.min(Number(num_jobs), 20),
      score_matches: true,
    }, { timeout: 150000, headers: aiHeaders }); // longer timeout — LLM scoring across multiple jobs takes time

    return res.json(aiRes.data);
  } catch (err) {
    console.error('Live jobs error:', err.message);
    return res.json(makeFallbackLiveJobs(dreamRole || 'Software Engineer', location, num_jobs));
  }
};

// GET /api/jobs/recommended  (student — AI match)
exports.getRecommendedJobs = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Not found' });

  let matchResults = [];
  try {
    const aiRes = await axios.post(`${AI}/api/v1/jobs/match`, {
      skills: student.skills.map(s => ({ name: s.name, level: s.level })),
      cgpa: student.cgpa,
      min_score: 30,
      limit: 20,
    }, { timeout: 12000 }); // 12s timeout — don't block on slow AI engine
    matchResults = aiRes.data.matches || [];
  } catch {}

  if (!matchResults.length) {
    // Fallback: keyword-score jobs against student skills + dreamRole
    const studentSkillNames = student.skills.map(s => s.name.toLowerCase());
    const dreamRole = (student.dreamRole || '').toLowerCase();
    const jobs = await Job.find({ status: 'active' })
      .populate('company', 'name logo location industry isVerified')
      .sort({ createdAt: -1 }).limit(50);

    const scored = jobs.map(j => {
      const titleLower = (j.title || '').toLowerCase();
      const descLower  = (j.description || '').toLowerCase();
      const jobSkills  = (j.skills || []).map(s => s.toLowerCase());

      // Count matching skills
      const matchedSkills = studentSkillNames.filter(sk => jobSkills.includes(sk) || descLower.includes(sk));
      const skillScore = Math.min(matchedSkills.length * 15, 60);

      // Dream role match bonus
      const roleScore = dreamRole && titleLower.includes(dreamRole.split(' ')[0]) ? 25 : 0;

      // Recency bonus (newer = slightly higher)
      const ageMs = Date.now() - new Date(j.createdAt).getTime();
      const recencyScore = Math.max(0, 15 - Math.floor(ageMs / (1000 * 60 * 60 * 24)));

      const matchScore = Math.min(skillScore + roleScore + recencyScore, 99);
      return { ...j.toObject(), match_score: matchScore, matched_skills: matchedSkills };
    })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 20);

    return res.json({ jobs: scored });
  }

  const jobIds = matchResults.map(m => m.job_id);
  const jobs = await Job.find({ _id: { $in: jobIds }, status: 'active' })
    .populate('company', 'name logo location industry isVerified');

  const enriched = jobs.map(job => {
    const match = matchResults.find(m => m.job_id === job._id.toString()) || {};
    return { ...job.toObject(), match_score: match.match_score || 0, match_quality: match.match_quality || 'fair', matched_skills: match.matched_skills || [], missing_skills: match.missing_skills || [] };
  }).sort((a, b) => b.match_score - a.match_score);

  res.json({ jobs: enriched });
};
