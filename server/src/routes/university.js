const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const University = require('../models/University');
const User = require('../models/User');
const Audit = require('../models/Audit');

// Get university batch analytics (TPO only)
router.get('/:id/analytics', protect, requireRole('tpo', 'admin'), async (req, res) => {
  const students = await User.find({ university: req.params.id });
  const studentIds = students.map(s => s._id);

  const audits = await Audit.find({
    user: { $in: studentIds },
    status: 'completed',
  }).select('auraScore extractedSkills jobMatches user');

  // Aggregate stats
  const scores = audits.map(a => a.auraScore?.overall || 0);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Skill frequency
  const skillCount = {};
  audits.forEach(a => {
    (a.extractedSkills || []).forEach(sk => {
      skillCount[sk] = (skillCount[sk] || 0) + 1;
    });
  });

  // Top job matches
  const jobCount = {};
  audits.forEach(a => {
    (a.jobMatches || []).forEach(jm => {
      jobCount[jm.title] = (jobCount[jm.title] || 0) + 1;
    });
  });

  res.json({
    totalStudents: students.length,
    auditsCompleted: audits.length,
    avgAuraScore: avgScore,
    skillDistribution: skillCount,
    topJobMatches: Object.entries(jobCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count })),
    scoreDistribution: {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      needsWork: scores.filter(s => s < 60).length,
    },
  });
});

// List universities
router.get('/', async (req, res) => {
  const universities = await University.find().select('name location');
  res.json({ universities });
});

// Create university (admin only)
router.post('/', protect, requireRole('admin'), async (req, res) => {
  const uni = await University.create(req.body);
  res.status(201).json({ university: uni });
});

module.exports = router;
