const axios = require('axios');
const FormData = require('form-data');
const Audit = require('../models/Audit');
const User = require('../models/User');
const { cloudinary } = require('../middleware/upload');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

exports.createAudit = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No PDF file uploaded' });
  }

  const { dreamRole, blindMode } = req.body;

  // Create audit record immediately with processing status
  const audit = await Audit.create({
    user: req.user._id,
    resumeUrl: req.file.path,
    resumePublicId: req.file.filename,
    originalFilename: req.file.originalname,
    dreamRole: dreamRole || req.user.dreamRole || '',
    blindMode: blindMode === 'true',
    status: 'processing',
  });

  // Respond immediately so frontend can poll/stream
  res.status(202).json({ auditId: audit._id, message: 'Analysis started' });

  // Process asynchronously
  processAuditAsync(audit, req.file, dreamRole || req.user.dreamRole).catch(
    async (err) => {
      await Audit.findByIdAndUpdate(audit._id, {
        status: 'failed',
        errorMessage: err.message,
      });
    }
  );
};

async function processAuditAsync(audit, file, dreamRole) {
  try {
    // Download PDF from Cloudinary to send to AI engine
    const pdfResponse = await axios.get(file.path, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(pdfResponse.data);

    // Send to AI Engine
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });
    formData.append('user_id', audit.user.toString());
    formData.append('dream_role', dreamRole || '');

    const aiResponse = await axios.post(`${AI_ENGINE_URL}/analyze`, formData, {
      headers: formData.getHeaders(),
      timeout: 120000, // 2 min timeout for AI
    });

    const data = aiResponse.data;

    // Update audit with results
    await Audit.findByIdAndUpdate(audit._id, {
      auraScore: data.aura_score,
      redlines: data.redlines || [],
      jobMatches: data.job_matches || [],
      extractedSkills: data.extracted_skills || [],
      extractedExperience: data.extracted_experience || [],
      gapAnalysis: data.gap_analysis || null,
      marketDemand: data.market_demand || {},
      marketMeta: data.market_meta || {},
      interviewQuestions: data.interview_questions || [],
      resumeMeta: data.resume_meta || {},
      status: 'completed',
    });

    // Update user stats
    const score = data.aura_score?.overall || 0;
    await User.findByIdAndUpdate(audit.user, {
      $inc: { totalAudits: 1 },
      $max: { bestAuraScore: score },
    });

  } catch (err) {
    throw err;
  }
}

exports.getAudit = async (req, res) => {
  const audit = await Audit.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate('user', 'name email dreamRole');

  if (!audit) return res.status(404).json({ message: 'Audit not found' });
  res.json({ audit });
};

exports.getAuditStatus = async (req, res) => {
  const audit = await Audit.findOne(
    { _id: req.params.id, user: req.user._id },
    'status errorMessage auraScore'
  );
  if (!audit) return res.status(404).json({ message: 'Audit not found' });
  res.json({ status: audit.status, score: audit.auraScore, error: audit.errorMessage });
};

exports.getMyAudits = async (req, res) => {
  const audits = await Audit.find({ user: req.user._id })
    .select('createdAt status auraScore originalFilename dreamRole')
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ audits });
};

exports.deleteAudit = async (req, res) => {
  const audit = await Audit.findOne({ _id: req.params.id, user: req.user._id });
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  // Delete from Cloudinary
  if (audit.resumePublicId) {
    await cloudinary.uploader.destroy(audit.resumePublicId, { resource_type: 'raw' });
  }

  await audit.deleteOne();
  res.json({ message: 'Audit deleted' });
};

exports.generateRoadmap = async (req, res) => {
  const { skills, dreamRole, days = 30 } = req.body;
  const skillStr = Array.isArray(skills) ? skills.join(', ') : (skills || dreamRole || '');
  const formData = new URLSearchParams({
    skill: skillStr,
    dream_role: dreamRole || skillStr,
    days: String(days),
  });
  const aiResp = await axios.post(`${AI_ENGINE_URL}/roadmap`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 90000,
  });
  res.json(aiResp.data);
};

exports.generateInterview = async (req, res) => {
  const audit = await Audit.findById(req.params.id);
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  const { role } = req.body;
  const resumeText = audit.extractedExperience?.join('\n') || audit.resumeText || '';
  const formData = new URLSearchParams({
    resume_text: resumeText.slice(0, 3000),
    role: role || audit.dreamRole || 'Software Engineer',
  });
  const aiResp = await axios.post(`${AI_ENGINE_URL}/interview`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 60000,
  });
  res.json(aiResp.data);
};

exports.enhanceBullet = async (req, res) => {
  const { original, roleContext } = req.body;
  const formData = new FormData();
  formData.append('original', original);
  formData.append('role_context', roleContext || '');
  const aiResp = await axios.post(`${AI_ENGINE_URL}/enhance-bullet`, formData, {
    headers: formData.getHeaders(),
  });
  res.json(aiResp.data);
};
