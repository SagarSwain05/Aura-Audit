const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const multer = require('multer');
const c = require('../controllers/universityController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect, requireRole('tpo', 'admin'));
router.get('/dashboard', c.getDashboard);
router.get('/profile', c.getProfile);
router.put('/profile', c.updateProfile);
router.get('/students', c.getStudents);
router.get('/students/:id', c.getStudentById);
router.put('/students/:id', c.updateStudent);
router.delete('/students/:id', c.deleteStudent);
router.post('/students/upload', upload.single('file'), c.batchUpload);
router.post('/students/bulk-list-as-alumni', c.bulkListPlacedAsAlumni);
router.post('/students/:id/list-as-alumni', c.listStudentAsAlumni);
router.delete('/students/:id/list-as-alumni', c.unlistStudentAsAlumni);
router.get('/employability', c.getEmployabilityMetrics);
router.get('/intervention', c.getAtRiskStudents);
router.get('/companies/pending', c.getPendingCompanies);
router.put('/companies/:id/verify', c.verifyCompany);

module.exports = router;
