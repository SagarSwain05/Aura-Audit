const Company = require('../models/Company');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const axios = require('axios');
const crypto = require('crypto');
const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

const READINESS_LABEL = (score) =>
  score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needs_growth';

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Detects whether a student's skills changed since their embedding was
// cached, without needing to hook every skill add/update/remove endpoint —
// the check happens lazily, here, at search time instead.
function skillsHash(skills) {
  const names = (skills || []).map((s) => s.name.toLowerCase()).sort().join('|');
  return crypto.createHash('md5').update(names).digest('hex');
}

// GET /api/company/jobs — the requesting company's OWN postings, any status
// (active/draft/closed). Job Management, Pipeline and AI Matching all used
// to call the public GET /api/jobs instead (all companies, active-only) —
// which meant a company's own "Job Management" page showed every other
// company's active postings too (including demo ones), draft jobs never
// appeared at all, and clicking Delete on a job you didn't own silently
// 404'd instead of just not being offered in the first place.
exports.getMyJobs = async (req, res) => {
  const company = await Company.findOne({ userId: req.user._id });
  if (!company) return res.status(404).json({ message: 'Company profile not found' });
  const jobs = await Job.find({ company: company._id }).sort({ createdAt: -1 });
  res.json({ jobs });
};

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
// location was previously missing from this projection entirely, so the
// candidate card's location line was always blank regardless of blind mode.
const CANDIDATE_FIELDS = 'name email skills cgpa department careerReadinessScore badges isPlaced location';

// True server-side redaction for Blind Hiring list results — PII never
// leaves the server, not just hidden in the UI. Applied as the very last
// step before any candidates array is sent back.
function redactForBlindMode(candidate) {
  const anonymousId = `Candidate #${crypto.createHash('md5').update(candidate._id.toString()).digest('hex').slice(0, 6).toUpperCase()}`;
  const { name, email, location, ...rest } = candidate; // eslint-disable-line no-unused-vars
  return { ...rest, name: anonymousId, anonymousId, blind: true };
}

// GET /api/company/candidates
// Structural filters (minCgpa/department/location) always apply first. A
// `skills` value is treated as a free-text ROLE-FIT query and ranked with
// Gemini 768-dim embeddings (services/embeddings.py, the same pipeline the
// student-side job matcher uses) instead of a literal keyword/regex match —
// "MERN" ranks a React/Node/Express/MongoDB profile highly even though none
// of those skill names contain the string "MERN". Falls back to the old
// keyword match only if the AI engine is unreachable.
exports.searchCandidates = async (req, res) => {
  const { skills, minCgpa, department, location, page = 1, limit = 20, blind } = req.query;
  const isBlind = blind === 'true';

  const filter = {};
  if (minCgpa) filter.cgpa = { $gte: Number(minCgpa) };
  if (department) filter.department = new RegExp(department, 'i');
  if (location) filter.location = new RegExp(location, 'i');

  if (!skills || !skills.trim()) {
    const students = await Student.find(filter)
      .select(CANDIDATE_FIELDS)
      .sort({ careerReadinessScore: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Student.countDocuments(filter);
    const candidates = students.map((s) => s.toObject());
    return res.json({ candidates: isBlind ? candidates.map(redactForBlindMode) : candidates, total, mode: 'filter' });
  }

  // Cap the pool embedded/ranked per search — plenty of headroom over the
  // current portal size, just a guard against embedding the whole DB at once
  // as it grows.
  const pool = await Student.find(filter)
    .select(`${CANDIDATE_FIELDS} +profileEmbedding +profileEmbeddingSkillsHash`)
    .limit(300);

  if (pool.length === 0) return res.json({ candidates: [], total: 0, mode: 'semantic' });

  const stale = pool.filter((s) => !s.profileEmbedding?.length || s.profileEmbeddingSkillsHash !== skillsHash(s.skills));

  if (stale.length > 0) {
    try {
      const batchRes = await axios.post(`${AI}/api/v1/candidates/embed-batch`, {
        students: stale.map((s) => ({ id: s._id.toString(), skills: s.skills.map((sk) => ({ name: sk.name, level: sk.level })) })),
      }, { timeout: 60000 });
      const vecById = new Map(batchRes.data.embeddings.map((e) => [e.id, e.vector]));
      await Promise.all(stale.map(async (s) => {
        const vec = vecById.get(s._id.toString());
        if (!vec) return;
        s.profileEmbedding = vec; // update in-memory copy too, so ranking below sees it
        await Student.updateOne({ _id: s._id }, { $set: { profileEmbedding: vec, profileEmbeddingSkillsHash: skillsHash(s.skills) } });
      }));
    } catch (err) {
      console.warn('Candidate embedding backfill failed:', err.message);
    }
  }

  let queryVec = null;
  try {
    const qRes = await axios.post(`${AI}/api/v1/candidates/embed-text`, { text: skills }, { timeout: 15000 });
    queryVec = qRes.data.vector;
  } catch (err) {
    console.warn('Query embedding failed, falling back to keyword match:', err.message);
  }

  if (!queryVec) {
    const skillArr = skills.split(',').map((s) => s.trim());
    const kwFilter = { ...filter, 'skills.name': { $in: skillArr.map((s) => new RegExp(s, 'i')) } };
    const students = await Student.find(kwFilter)
      .select(CANDIDATE_FIELDS)
      .sort({ careerReadinessScore: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await Student.countDocuments(kwFilter);
    const candidates = students.map((s) => s.toObject());
    return res.json({ candidates: isBlind ? candidates.map(redactForBlindMode) : candidates, total, mode: 'keyword-fallback' });
  }

  const ranked = pool
    .map((s) => {
      const obj = s.toObject();
      delete obj.profileEmbedding;
      delete obj.profileEmbeddingSkillsHash;
      return { ...obj, semanticScore: s.profileEmbedding?.length ? Math.round(cosineSimilarity(queryVec, s.profileEmbedding) * 100) : 0 };
    })
    .sort((a, b) => b.semanticScore - a.semanticScore);

  const startIdx = (page - 1) * Number(limit);
  const paged = ranked.slice(startIdx, startIdx + Number(limit));

  res.json({ candidates: isBlind ? paged.map(redactForBlindMode) : paged, total: ranked.length, mode: 'semantic' });
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

// GET /api/company/candidates/:id/blind-profile — LLM-powered blind hiring.
// Genuine server-side redaction, not client-side hiding: name, email,
// location and institution NEVER leave this response, so there's nothing
// for a recruiter to see even by inspecting network traffic. What's left
// (skills, CGPA, career readiness, department as a field of study) plus an
// LLM-written summary is what an unbiased, skill-first screen is built on.
// Identity is only reachable through the separate GET .../reveal below — a
// deliberate second action, not something that leaks alongside the profile.
exports.getBlindProfile = async (req, res) => {
  const student = await Student.findById(req.params.id).select('skills cgpa careerReadinessScore badges department dreamRole isPlaced');
  if (!student) return res.status(404).json({ message: 'Candidate not found' });

  const anonymousId = crypto.createHash('md5').update(student._id.toString()).digest('hex').slice(0, 6).toUpperCase();

  let summary = null;
  try {
    const aiRes = await axios.post(`${AI}/api/v1/candidates/blind-summary`, {
      department: student.department || '',
      skills: student.skills.map((s) => s.name),
      cgpa: student.cgpa || 0,
      readiness: student.careerReadinessScore || 0,
      dream_role: student.dreamRole || '',
    }, { timeout: 20000 });
    summary = aiRes.data.summary || null;
  } catch (err) {
    console.warn('Blind summary generation failed:', err.message);
  }

  res.json({
    anonymousId: `Candidate #${anonymousId}`,
    department: student.department,
    skills: student.skills,
    cgpa: student.cgpa,
    careerReadinessScore: student.careerReadinessScore,
    badges: student.badges,
    dreamRole: student.dreamRole,
    isPlaced: student.isPlaced,
    summary,
    redacted: ['name', 'email', 'location', 'university'],
  });
};

// GET /api/company/candidates/:id/reveal — deliberate, separate action to
// un-blind a candidate's identity once a recruiter has screened on merit.
exports.revealCandidate = async (req, res) => {
  const student = await Student.findById(req.params.id)
    .select('name email location')
    .populate({ path: 'university', select: 'name' });
  if (!student) return res.status(404).json({ message: 'Candidate not found' });
  res.json({
    name: student.name,
    email: student.email,
    location: student.location,
    university: student.university?.name || null,
  });
};

// POST /api/company/kyc  — upload KYC doc URL
exports.uploadKYC = async (req, res) => {
  const { docType, url } = req.body;
  const company = await Company.findOne({ userId: req.user._id });
  company.kycDocuments.push({ docType, url, status: 'pending' });
  await company.save();
  res.json({ kycDocuments: company.kycDocuments });
};
