const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/assessmentController');

router.use(protect);
router.post('/generate', requireRole('student'), c.generateAssessment);
router.post('/:id/submit', requireRole('student'), c.submitAssessment);
router.get('/', requireRole('student'), c.getAssessments);
router.get('/:id', c.getAssessmentById);

module.exports = router;
