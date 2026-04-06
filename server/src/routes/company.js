const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const c = require('../controllers/companyController');

router.use(protect, requireRole('company'));
router.get('/dashboard', c.getDashboard);
router.get('/profile', c.getProfile);
router.put('/profile', c.updateProfile);
router.get('/candidates', c.searchCandidates);
router.post('/candidates/match', c.matchCandidates);
router.post('/kyc', c.uploadKYC);

module.exports = router;
