const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/studentController');

router.use(protect, requireRole('student'));
router.get('/dashboard', c.getDashboard);
router.get('/profile', c.getProfile);
router.put('/profile', c.updateProfile);
router.post('/skills', c.addSkill);
router.put('/skills/:skillName', c.updateSkill);
router.delete('/skills/:skillName', c.removeSkill);
router.post('/certifications', c.addCertification);
router.delete('/certifications/:id', c.removeCertification);
router.post('/projects', c.addProject);
router.delete('/projects/:id', c.removeProject);
router.get('/leaderboard', c.getLeaderboard);

module.exports = router;
