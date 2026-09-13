const University = require('../models/University');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Alumni = require('../models/Alumni');
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
