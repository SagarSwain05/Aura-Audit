const University = require('../models/University');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const csv = require('csv-parse/sync');

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

// GET /api/university/dashboard
exports.getDashboard = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  if (!uni) return res.status(404).json({ message: 'Not found' });

  const students = await Student.find({ university: uni._id });
  const placed = students.filter(s => s.isPlaced);
  const unplaced = students.filter(s => !s.isPlaced);

  // Department distribution
  const deptMap = {};
  students.forEach(s => { deptMap[s.department || 'Unknown'] = (deptMap[s.department || 'Unknown'] || 0) + 1; });

  // Score distribution
  const scores = students.map(s => s.careerReadinessScore);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Skill frequency
  const skillMap = {};
  students.forEach(s => s.skills.forEach(sk => { skillMap[sk.name] = (skillMap[sk.name] || 0) + 1; }));
  const topSkills = Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  res.json({
    university: uni,
    stats: {
      total: students.length,
      placed: placed.length,
      unplaced: unplaced.length,
      avgCareerScore: avgScore,
      placementRate: students.length ? Math.round((placed.length / students.length) * 100) : 0,
    },
    departmentDistribution: deptMap,
    scoreDistribution: {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      fair: scores.filter(s => s >= 40 && s < 60).length,
      atRisk: scores.filter(s => s < 40).length,
    },
    topSkills,
  });
};

// GET /api/university/students
exports.getStudents = async (req, res) => {
  const uni = await University.findOne({ tpoEmail: req.user.email });
  const { department, status, q, page = 1, limit = 30 } = req.query;

  const filter = { university: uni._id };
  if (department) filter.department = department;
  if (status === 'placed') filter.isPlaced = true;
  if (status === 'unplaced') filter.isPlaced = false;
  if (q) filter.$or = [
    { name: new RegExp(q, 'i') },
    { email: new RegExp(q, 'i') },
    { rollNumber: new RegExp(q, 'i') },
  ];

  const [students, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Student.countDocuments(filter),
  ]);
  res.json({ students, total });
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
  const students = await Student.find({ university: uni._id });

  const byDept = {};
  students.forEach(s => {
    const dept = s.department || 'Unknown';
    if (!byDept[dept]) byDept[dept] = { total: 0, scores: [], placed: 0 };
    byDept[dept].total++;
    byDept[dept].scores.push(s.careerReadinessScore);
    if (s.isPlaced) byDept[dept].placed++;
  });

  const deptMetrics = Object.entries(byDept).map(([dept, data]) => ({
    department: dept,
    total: data.total,
    placed: data.placed,
    avgScore: data.scores.length ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
    placementRate: Math.round((data.placed / data.total) * 100),
  }));

  res.json({ deptMetrics, totalStudents: students.length });
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
