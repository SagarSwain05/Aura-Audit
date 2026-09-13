const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/alumniController');

router.use(protect, requireRole('student'));

router.get('/directory', c.getDirectory);
router.get('/me', c.getMyAlumniProfile);
router.put('/me', c.upsertMyAlumniProfile);
router.post('/connect/:alumniId', c.sendConnectionRequest);
router.get('/requests', c.getRequests);
router.put('/requests/:id/respond', c.respondToRequest);

module.exports = router;
