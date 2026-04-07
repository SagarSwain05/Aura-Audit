const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');

// GET /api/student/profile
exports.getProfile = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id })
    .populate('university', 'name location');
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  res.json({ student: student.toPublicJSON() });
};

// PUT /api/student/profile
exports.updateProfile = async (req, res) => {
  const fields = ['name', 'bio', 'phone', 'location', 'dreamRole', 'department',
                  'rollNumber', 'year', 'semester', 'cgpa', 'socialLinks', 'profilePic'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const student = await Student.findOneAndUpdate(
    { userId: req.user._id },
    { $set: { ...updates, profileCompleted: true } },
    { new: true, runValidators: true }
  );
  if (!student) return res.status(404).json({ message: 'Profile not found' });

  student.calculateCareerReadinessScore();
  await student.save();
  res.json({ student: student.toPublicJSON() });
};

// POST /api/student/skills
exports.addSkill = async (req, res) => {
  const { name, level } = req.body;
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Profile not found' });

  const exists = student.skills.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (exists) return res.status(409).json({ message: 'Skill already added' });

  student.skills.push({ name, level: level || 'beginner' });
  student.calculateCareerReadinessScore();

  // Award points for first skill add
  if (student.skills.length === 1) {
    student.careerPoints.total += 10;
    student.careerPoints.history.push({ points: 10, reason: 'First skill added' });
  }
  await student.save();
  res.status(201).json({ skills: student.skills, careerReadinessScore: student.careerReadinessScore });
};

// PUT /api/student/skills/:skillName
exports.updateSkill = async (req, res) => {
  const { skillName } = req.params;
  const { level } = req.body;
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Profile not found' });

  const skill = student.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (!skill) return res.status(404).json({ message: 'Skill not found' });

  skill.level = level;
  student.calculateCareerReadinessScore();
  await student.save();
  res.json({ skills: student.skills });
};

// DELETE /api/student/skills/:skillName
exports.removeSkill = async (req, res) => {
  const { skillName } = req.params;
  const student = await Student.findOne({ userId: req.user._id });
  student.skills = student.skills.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
  student.calculateCareerReadinessScore();
  await student.save();
  res.json({ skills: student.skills });
};

// POST /api/student/certifications
exports.addCertification = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  student.certifications.push(req.body);
  student.calculateCareerReadinessScore();
  student.careerPoints.total += 20;
  student.careerPoints.history.push({ points: 20, reason: `Certification: ${req.body.name}` });
  await student.save();
  res.status(201).json({ certifications: student.certifications });
};

// DELETE /api/student/certifications/:id
exports.removeCertification = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  student.certifications = student.certifications.filter(c => c._id.toString() !== req.params.id);
  student.calculateCareerReadinessScore();
  await student.save();
  res.json({ certifications: student.certifications });
};

// POST /api/student/projects
exports.addProject = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  student.projects.push(req.body);
  student.careerPoints.total += 15;
  student.careerPoints.history.push({ points: 15, reason: `Project: ${req.body.title}` });
  await student.save();
  res.status(201).json({ projects: student.projects });
};

// DELETE /api/student/projects/:id
exports.removeProject = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  student.projects = student.projects.filter(p => p._id.toString() !== req.params.id);
  await student.save();
  res.json({ projects: student.projects });
};

// GET /api/student/dashboard
exports.getDashboard = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id }).populate('university', 'name');
  if (!student) return res.status(404).json({ message: 'Profile not found' });

  const JobApplication = require('../models/JobApplication');
  const Assessment = require('../models/Assessment');

  const [applications, assessments, unreadNotifs] = await Promise.all([
    JobApplication.find({ student: student._id })
      .sort({ appliedAt: -1 }).limit(5)
      .populate('job', 'title location type'),
    Assessment.find({ student: student._id, status: 'evaluated' })
      .sort({ evaluatedAt: -1 }).limit(3),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  const appStats = {
    total: await JobApplication.countDocuments({ student: student._id }),
    shortlisted: await JobApplication.countDocuments({ student: student._id, status: 'shortlisted' }),
    interviews: await JobApplication.countDocuments({ student: student._id, status: 'interview_scheduled' }),
    selected: await JobApplication.countDocuments({ student: student._id, status: 'selected' }),
  };

  res.json({
    student: {
      name: student.name,
      careerReadinessScore: student.careerReadinessScore,
      careerPoints: { total: student.careerPoints.total },
      skills: student.skills,
      badges: student.badges || [],
      rank: student.rank || { overall: null, branch: null },
      activityStats: {
        jobsApplied: appStats.total,
        certificationsEarned: student.certifications.length,
        interviewsAttended: appStats.interviews,
        coursesCompleted: 0,
      },
      isPlaced: student.isPlaced,
      dreamRole: student.dreamRole,
      cgpa: student.cgpa,
    },
    applicationStats: appStats,
    recentApplications: applications,
    recentAssessments: assessments,
    unreadNotifications: unreadNotifs,
  });
};

// GET /api/student/leaderboard
exports.getLeaderboard = async (req, res) => {
  const top = await Student.find({ careerReadinessScore: { $gt: 0 } })
    .select('name department careerReadinessScore careerPoints badges')
    .sort({ 'careerPoints.total': -1 })
    .limit(20);
  res.json({ leaderboard: top });
};
