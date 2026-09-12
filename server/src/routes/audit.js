const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createAudit,
  getAudit,
  getAuditStatus,
  getMyAudits,
  deleteAudit,
  generateRoadmap,
  generateInterview,
  enhanceBullet,
  saveRedlineAcceptance,
  downloadEditedResume,
} = require('../controllers/auditController');

router.post('/', protect, upload.single('resume'), createAudit);
router.get('/', protect, getMyAudits);
router.get('/:id', protect, getAudit);
router.get('/:id/status', protect, getAuditStatus);
router.delete('/:id', protect, deleteAudit);
router.post('/roadmap', protect, generateRoadmap);
router.post('/:id/interview', protect, generateInterview);
router.post('/enhance-bullet', protect, enhanceBullet);
router.patch('/:id/redlines', protect, saveRedlineAcceptance);
router.get('/:id/download-edited', protect, downloadEditedResume);

module.exports = router;
