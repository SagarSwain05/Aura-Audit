const axios = require('axios');
const University = require('../models/University');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Alumni = require('../models/Alumni');
const Notice = require('../models/Notice');
const bcrypt = require('bcryptjs');
const csv = require('csv-parse/sync');

const AI_ENGINE_URL = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// GET /api/university/profile
exports.getProfile = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'Not found' });
  res.json({ university: uni });
};

// PUT /api/university/profile
exports.updateProfile = async (req, res) => {
  const uni = await University.findOneAndUpdate(
    { tpoEmail: req.user.email }, req.body, { new: true }
  );
  res.json({ university: uni });
};

// Shared by the dashboard and AI insights — the same real numbers should
// drive both what's displayed and what the AI reasons about.
async function computeCohortStats(uni) {
  const Company = require('../models/Company');
  const [students, pendingCompaniesCount] = await Promise.all([
    Student.find({ university: uni._id }),
    Company.countDocuments({ 'kycDocuments.status': 'pending' }),
  ]);

  const placed = students.filter(s => s.isPlaced);
  const atRisk = students.filter(s => !s.isPlaced && s.careerReadinessScore < 40);

  const deptMap = {};
  students.forEach(s => {
    const dept = s.department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, scores: [], placed: 0 };
    deptMap[dept].total++;
    deptMap[dept].scores.push(s.careerReadinessScore || 0);
    if (s.isPlaced) deptMap[dept].placed++;
  });
  const departmentStats = Object.entries(deptMap).map(([department, d]) => ({
    department,
    count: d.total,
    placed: d.placed,
    avgScore: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
  }));

  const scores = students.map(s => s.careerReadinessScore || 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Skill gap = a skill fewer than 1/3 of the cohort has, among the skills
  // that DO appear (i.e. relevant-but-underrepresented, not just "rare").
  const skillMap = {};
  students.forEach(s => s.skills.forEach(sk => { skillMap[sk.name] = (skillMap[sk.name] || 0) + 1; }));
  const topSkillGaps = Object.entries(skillMap)
    .filter(([, count]) => students.length > 0 && count / students.length < 0.34)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 8)
    .map(([name]) => name);

  const recentPlacements = placed
    .filter(s => s.placementDetails?.joiningDate)
    .sort((a, b) => new Date(b.placementDetails.joiningDate) - new Date(a.placementDetails.joiningDate))
    .slice(0, 8)
    .map(s => ({
      name: s.name,
      company: s.placementDetails.companyName,
      role: s.placementDetails.jobRole,
      package: s.placementDetails.package,
    }));

  return {
    stats: {
      totalStudents: students.length,
      placedStudents: placed.length,
      avgScore,
      atRiskCount: atRisk.length,
      pendingCompanies: pendingCompaniesCount,
    },
    topSkillGaps,
    departmentStats,
    recentPlacements,
  };
}

// GET /api/university/dashboard
exports.getDashboard = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'Not found' });

  const cohort = await computeCohortStats(uni);
  res.json({ university: uni, ...cohort });
};

// GET /api/university/insights — AI cohort analysis, cached for 12h unless
// ?refresh=true. Sends only aggregate numbers to the AI engine, never
// individual student data.
const INSIGHTS_TTL_MS = 12 * 60 * 60 * 1000;

exports.getInsights = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'Not found' });

  const isFresh = uni.aiInsights?.generatedAt &&
    (Date.now() - new Date(uni.aiInsights.generatedAt).getTime()) < INSIGHTS_TTL_MS;
  if (isFresh && req.query.refresh !== 'true') {
    return res.json({ summary: uni.aiInsights.summary, actions: uni.aiInsights.actions, generatedAt: uni.aiInsights.generatedAt, cached: true });
  }

  const cohort = await computeCohortStats(uni);
  if (cohort.stats.totalStudents === 0) {
    return res.json({ summary: 'No students yet — insights will appear once your roster has data.', actions: [], cached: false });
  }

  try {
    const aiRes = await axios.post(`${AI_ENGINE_URL}/api/v1/university/insights`, {
      universityName: uni.name,
      totalStudents: cohort.stats.totalStudents,
      placedStudents: cohort.stats.placedStudents,
      avgScore: cohort.stats.avgScore,
      atRiskCount: cohort.stats.atRiskCount,
      departmentStats: cohort.departmentStats,
      topSkillGaps: cohort.topSkillGaps,
    }, {
      timeout: 150000,
      headers: req.headers['x-user-gemini-key'] ? { 'x-user-gemini-key': req.headers['x-user-gemini-key'] } : {},
    });

    uni.aiInsights = { summary: aiRes.data.summary, actions: aiRes.data.actions, generatedAt: new Date() };
    await uni.save();

    res.json({ summary: aiRes.data.summary, actions: aiRes.data.actions, generatedAt: uni.aiInsights.generatedAt, cached: false });
  } catch (err) {
    console.warn('University insights AI unavailable:', err.message);
    res.status(502).json({ message: 'AI engine is temporarily unavailable — try again shortly.' });
  }
};

// GET /api/university/students
exports.getStudents = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  const { department, status, isPlaced, q, page = 1, limit = 30 } = req.query;

  const filter = { university: uni._id };
  if (department) filter.department = department;
  if (status === 'placed') filter.isPlaced = true;
  if (status === 'unplaced') filter.isPlaced = false;
  // Placements page filters via ?isPlaced=true/false rather than ?status=placed/unplaced
  if (isPlaced === 'true') filter.isPlaced = true;
  if (isPlaced === 'false') filter.isPlaced = false;
  if (q) filter.$or = [
    { name: new RegExp(q, 'i') },
    { email: new RegExp(q, 'i') },
    { rollNumber: new RegExp(q, 'i') },
  ];

  // Real students always sort ahead of demo/seed data, regardless of volume
  // — otherwise a batch of demo records (all freshly created) buries real
  // students on later pages under the default newest-first order.
  const [students, total] = await Promise.all([
    Student.find(filter).sort({ isDemo: 1, createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Student.countDocuments(filter),
  ]);

  const listedIds = new Set(
    (await Alumni.find({ student: { $in: students.map((s) => s._id) } }).distinct('student')).map(String)
  );
  const studentsWithAlumniStatus = students.map((s) => ({ ...s.toObject(), alumniListed: listedIds.has(String(s._id)) }));

  res.json({ students: studentsWithAlumniStatus, total });
};

// GET /api/university/students/:id
exports.getStudentById = async (req, res) => {
  const student = await Student.findById(req.params.id).populate('university', 'name');
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json({ student });
};

// PUT /api/university/students/:id
exports.updateStudent = async (req, res) => {
  const allowed = ['cgpa', 'year', 'semester', 'department', 'rollNumber', 'isPlaced', 'placementDetails'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!student) return res.status(404).json({ message: 'Not found' });
  student.calculateCareerReadinessScore();
  await student.save();
  res.json({ student });
};

// Shared by single and bulk listing below — builds the Alumni upsert payload
// from a student's existing (real) placement record on file.
const alumniPayloadFromStudent = (student, uni, overrides = {}) => {
  const company = overrides.currentCompany || student.placementDetails?.companyName || '';
  const role = overrides.currentRole || student.placementDetails?.jobRole || '';
  const year = overrides.graduationYear
    || (student.placementDetails?.joiningDate ? new Date(student.placementDetails.joiningDate).getFullYear() : undefined);
  return {
    currentCompany: company,
    currentRole: role,
    graduationYear: year,
    skills: student.skills.map((s) => s.name),
    isAvailableForMentorship: overrides.isAvailableForMentorship !== undefined ? overrides.isAvailableForMentorship : true,
    bio: overrides.bio || `Placed as ${role || 'a professional'} at ${company || 'their organization'} — listed by ${uni.name}.`,
    linkedinUrl: student.socialLinks?.linkedin || '',
    verified: true,
    verifiedBy: uni._id,
  };
};

// POST /api/university/students/:id/list-as-alumni — TPO lists a real, placed
// student as a verified alumnus using the placement record already on file.
// This is how the Alumni Connect directory gets seeded with genuine people
// instead of staying empty until students self-declare one by one.
exports.listStudentAsAlumni = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const student = await Student.findOne({ _id: req.params.id, university: uni._id });
  if (!student) return res.status(404).json({ message: 'Student not found in your university' });

  const overrides = req.body;
  if (!student.isPlaced && !overrides.currentCompany) {
    return res.status(400).json({ message: 'This student has no placement record — provide currentCompany/currentRole to list them as alumni anyway.' });
  }

  const alumni = await Alumni.findOneAndUpdate(
    { student: student._id },
    { $set: alumniPayloadFromStudent(student, uni, overrides) },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({ alumni });
};

// POST /api/university/students/bulk-list-as-alumni — list every currently
// placed student (who isn't already TPO-listed) in one action, seeding the
// directory at scale from real placement records instead of one at a time.
exports.bulkListPlacedAsAlumni = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const placedStudents = await Student.find({ university: uni._id, isPlaced: true });
  const alreadyListed = await Alumni.find({ student: { $in: placedStudents.map((s) => s._id) } }).distinct('student');
  const alreadyListedSet = new Set(alreadyListed.map(String));
  const toList = placedStudents.filter((s) => !alreadyListedSet.has(String(s._id)));

  let listed = 0;
  for (const student of toList) {
    await Alumni.findOneAndUpdate(
      { student: student._id },
      { $set: alumniPayloadFromStudent(student, uni) },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    listed++;
  }

  res.json({ listed, alreadyListed: alreadyListedSet.size, totalPlaced: placedStudents.length });
};

// DELETE /api/university/students/:id/list-as-alumni — remove a TPO-verified listing
exports.unlistStudentAsAlumni = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const student = await Student.findOne({ _id: req.params.id, university: uni._id });
  if (!student) return res.status(404).json({ message: 'Student not found in your university' });

  await Alumni.deleteOne({ student: student._id, verified: true, verifiedBy: uni._id });
  res.json({ message: 'Removed from alumni directory' });
};

// DELETE /api/university/students/:id
exports.deleteStudent = async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (student) await User.findByIdAndDelete(student.userId);
  res.json({ message: 'Deleted' });
};

// POST /api/university/students/upload  — CSV batch import
exports.batchUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'CSV file required' });

  const uni = await University.findOne({ tpoEmail: req.user.email });
  const rows = csv.parse(req.file.buffer, { columns: true, skip_empty_lines: true });

  let created = 0, skipped = 0, errors = [];

  for (const row of rows) {
    try {
      const email = (row.email || '').toLowerCase().trim();
      if (!email) { skipped++; continue; }

      const exists = await User.findOne({ email });
      if (exists) { skipped++; continue; }

      const tempPwd = Math.random().toString(36).slice(-8);
      const user = await User.create({ name: row.name || email, email, password: tempPwd, role: 'student' });
      await Student.create({
        userId: user._id,
        name: row.name || email,
        email,
        department: row.department || '',
        rollNumber: row.rollNumber || row.roll_number || '',
        year: Number(row.year) || 1,
        cgpa: Number(row.cgpa) || 0,
        university: uni._id,
        isTemporaryPassword: true,
        temporaryPassword: tempPwd,
      });
      created++;
    } catch (e) {
      errors.push({ row: row.email, error: e.message });
    }
  }

  res.json({ created, skipped, errors, total: rows.length });
};

// GET /api/university/employability
exports.getEmployabilityMetrics = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'Not found' });
  const students = await Student.find({ university: uni._id });

  const placedCount = students.filter(s => s.isPlaced).length;
  const scores = students.map(s => s.careerReadinessScore || 0);
  const cgpas = students.map(s => s.cgpa || 0).filter(c => c > 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const avgCGPA = cgpas.length ? cgpas.reduce((a, b) => a + b, 0) / cgpas.length : 0;

  // By department
  const byDept = {};
  students.forEach(s => {
    const dept = s.department || 'Unknown';
    if (!byDept[dept]) byDept[dept] = { total: 0, scores: [], placed: 0, cgpas: [] };
    byDept[dept].total++;
    byDept[dept].scores.push(s.careerReadinessScore || 0);
    if (s.cgpa) byDept[dept].cgpas.push(s.cgpa);
    if (s.isPlaced) byDept[dept].placed++;
  });
  const byDepartment = Object.entries(byDept).map(([dept, d]) => ({
    department: dept,
    total: d.total,
    count: d.total,
    placed: d.placed,
    avgScore: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
    avgCGPA: d.cgpas.length ? Number((d.cgpas.reduce((a, b) => a + b, 0) / d.cgpas.length).toFixed(2)) : 0,
    placementRate: d.total ? Math.round((d.placed / d.total) * 100) : 0,
  }));

  // Skill distribution — top skills as a % of the cohort that has them
  const skillMap = {};
  students.forEach(s => s.skills.forEach(sk => { skillMap[sk.name] = (skillMap[sk.name] || 0) + 1; }));
  const skillDistribution = Object.entries(skillMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count, percentage: students.length ? Math.round((count / students.length) * 100) : 0 }));

  // Score distribution buckets for the pie chart
  const buckets = [
    { range: '80-100', min: 80, max: 101 },
    { range: '60-79', min: 60, max: 80 },
    { range: '40-59', min: 40, max: 60 },
    { range: '0-39', min: 0, max: 40 },
  ];
  const scoreDistribution = buckets
    .map(b => ({ range: b.range, count: scores.filter(s => s >= b.min && s < b.max).length }))
    .filter(b => b.count > 0);

  // Year-wise overview
  const byYear = {};
  students.forEach(s => {
    const year = s.year || 0;
    if (!byYear[year]) byYear[year] = { scores: [], placed: 0, total: 0 };
    byYear[year].total++;
    byYear[year].scores.push(s.careerReadinessScore || 0);
    if (s.isPlaced) byYear[year].placed++;
  });
  const yearWise = Object.entries(byYear)
    .filter(([year]) => Number(year) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, d]) => ({
      year: Number(year),
      total: d.total,
      placed: d.placed,
      avgScore: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
    }));

  res.json({
    overall: {
      avgScore,
      placementRate: students.length ? Math.round((placedCount / students.length) * 100) : 0,
      avgCGPA,
      totalStudents: students.length,
    },
    byDepartment,
    skillDistribution,
    scoreDistribution,
    yearWise,
  });
};

// GET /api/university/intervention  — at-risk students
exports.getAtRiskStudents = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  const atRisk = await Student.find({ university: uni._id, careerReadinessScore: { $lt: 40 }, isPlaced: false })
    .select('name email department careerReadinessScore skills cgpa year')
    .sort({ careerReadinessScore: 1 });

  const categorized = atRisk.map(s => ({
    ...s.toObject(),
    riskLevel: s.careerReadinessScore < 20 ? 'critical' : s.careerReadinessScore < 30 ? 'high' : 'medium',
    issues: [
      s.skills.length < 3 ? 'Less than 3 skills' : null,
      s.cgpa < 6 ? 'Low CGPA' : null,
      s.certifications?.length === 0 ? 'No certifications' : null,
    ].filter(Boolean),
  }));

  res.json({ atRiskStudents: categorized, total: categorized.length });
};

// GET /api/university/companies/pending  — company KYC review
exports.getPendingCompanies = async (req, res) => {
  const Company = require('../models/Company');
  const pending = await Company.find({ 'kycDocuments.status': 'pending' })
    .select('name industry website kycDocuments createdAt');
  res.json({ companies: pending });
};

// PUT /api/university/companies/:id/verify
exports.verifyCompany = async (req, res) => {
  const Company = require('../models/Company');
  const { action, comment } = req.body; // approve | reject
  const company = await Company.findById(req.params.id);
  if (!company) return res.status(404).json({ message: 'Not found' });

  company.kycDocuments.forEach(doc => {
    if (doc.status === 'pending') {
      doc.status = action === 'approve' ? 'approved' : 'rejected';
      doc.reviewComment = comment;
    }
  });
  company.isVerified = action === 'approve';
  await company.save();
  res.json({ company });
};

// ── Placement Notice Board ──────────────────────────────────────────────

// POST /api/university/notices
exports.createNotice = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const { title, message, type, company, eventDate, link, pinned } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'title and message are required' });

  const notice = await Notice.create({
    university: uni._id,
    postedBy: req.user._id,
    title, message,
    type: type || 'general',
    company: company || '',
    eventDate: eventDate || undefined,
    link: link || '',
    pinned: !!pinned,
  });

  // Notify every student affiliated with this university
  const students = await Student.find({ university: uni._id }).select('userId');
  if (students.length) {
    const notifs = students.map((s) => ({
      user: s.userId,
      type: 'system',
      title: `New notice: ${title}`,
      message: message.slice(0, 140),
      link: '/student/notices',
    }));
    const created = await Notification.insertMany(notifs);
    if (global.emitToUser) {
      created.forEach((n) => global.emitToUser(n.user.toString(), 'notification', n));
    }
  }

  res.status(201).json({ notice });
};

// GET /api/university/notices — TPO's own notices, for management
exports.getMyNotices = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });
  const notices = await Notice.find({ university: uni._id }).sort({ pinned: -1, createdAt: -1 });
  res.json({ notices });
};

// PUT /api/university/notices/:id
exports.updateNotice = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const allowed = ['title', 'message', 'type', 'company', 'eventDate', 'link', 'pinned'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const notice = await Notice.findOneAndUpdate(
    { _id: req.params.id, university: uni._id }, updates, { new: true }
  );
  if (!notice) return res.status(404).json({ message: 'Notice not found' });
  res.json({ notice });
};

// DELETE /api/university/notices/:id
exports.deleteNotice = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'University profile not found' });

  const notice = await Notice.findOneAndDelete({ _id: req.params.id, university: uni._id });
  if (!notice) return res.status(404).json({ message: 'Notice not found' });
  res.json({ message: 'Deleted' });
};
