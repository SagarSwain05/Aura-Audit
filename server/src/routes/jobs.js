const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/jobController');

// Student-specific named routes MUST come before /:id to avoid route collision
router.get('/student/recommended', protect, requireRole('student'), c.getRecommendedJobs);
router.get('/student/applications', protect, requireRole('student'), c.getMyApplications);
router.get('/student/live', protect, requireRole('student'), c.getLiveJobs);

// Public
router.get('/', c.getJobs);
router.get('/:id', c.getJobById);

// Student actions on specific jobs
router.post('/:id/apply', protect, requireRole('student'), c.applyJob);

// Company
router.post('/', protect, requireRole('company'), c.createJob);
router.put('/:id', protect, requireRole('company'), c.updateJob);
router.delete('/:id', protect, requireRole('company'), c.deleteJob);
router.get('/:id/applications', protect, requireRole('company'), c.getJobApplications);
router.put('/applications/:id/status', protect, requireRole('company'), c.updateApplicationStatus);

module.exports = router;
