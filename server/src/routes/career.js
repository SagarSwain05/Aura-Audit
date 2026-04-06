const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/careerController');

router.use(protect, requireRole('student'));
router.get('/recommendations', c.getCareerRecommendations);
router.post('/roadmap', c.getCareerRoadmap);
router.get('/interview-questions', c.getInterviewQuestions);

module.exports = router;
