const axios = require('axios');
const FormData = require('form-data');
const Audit = require('../models/Audit');
const User = require('../models/User');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { cloudinary } = require('../middleware/upload');
const { makeFallbackRoadmap, makeFallbackInterview, makeFallbackBulletEnhancement } = require('../utils/aiFallbacks');
const { matchSkillToCatalog } = require('../utils/skillCategorizer');

const AI_ENGINE_URL = (process.env.AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');

function getAxiosErrorMessage(err) {
  if (err.response) {
    const detail = err.response.data?.detail || err.response.data?.message || JSON.stringify(err.response.data);
    return `AI engine ${err.response.status}: ${detail}`;
  }
  if (err.code === 'ECONNABORTED') return 'AI engine request timed out';
  if (err.code) return `${err.code}: ${err.message}`;
  return err.message || 'Unknown AI engine error';
}

function buildFallbackAuditResult(errorMessage) {
  return {
    auraScore: {
      technical_density: 50,
      impact_quotient: 45,
      formatting_health: 60,
      ats_compatibility: 50,
      overall: 51,
    },
    redlines: [{
      original: 'AI analysis was temporarily unavailable.',
      suggestion: 'Retry the audit later for full AI redlines. In the meantime, add quantified impact, clear skills, and ATS-friendly section headings.',
      reason: errorMessage || 'AI provider temporarily unavailable.',
      category: 'impact',
      severity: 'warning',
      line_index: 0,
    }],
    jobMatches: [],
    extractedSkills: [],
    extractedExperience: [],
    gapAnalysis: null,
    marketDemand: {},
    marketMeta: {},
    interviewQuestions: [],
    resumeMeta: { fallback: true },
    status: 'completed',
    errorMessage: errorMessage || null,
  };
}

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
  const userGeminiKey = req.headers['x-user-gemini-key'] || null;
  processAuditAsync(audit, req.file, dreamRole || req.user.dreamRole, userGeminiKey).catch(
    async (err) => {
      console.error('Audit processing failed:', getAxiosErrorMessage(err));
      await Audit.findByIdAndUpdate(audit._id, {
        status: 'failed',
        errorMessage: getAxiosErrorMessage(err),
      });
      if (global.emitAuditUpdate) {
        global.emitAuditUpdate(audit._id.toString(), {
          status: 'failed',
          error: getAxiosErrorMessage(err),
        });
      }
    }
  );
};

async function processAuditAsync(audit, file, dreamRole, userGeminiKey) {
  try {
    // Download PDF from Cloudinary to send to AI engine
    const pdfResponse = await axios.get(file.path, { responseType: 'arraybuffer', timeout: 30000 });
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
      headers: {
        ...formData.getHeaders(),
        ...(userGeminiKey ? { 'x-user-gemini-key': userGeminiKey } : {}),
      },
      timeout: 180000, // Render free-tier cold starts + LLM calls can be slow
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
      detectedLocation: data.location || '',
      resumeMeta: data.resume_meta || {},
      status: 'completed',
    });

    // Update user stats
    const score = data.aura_score?.overall || 0;
    await User.findByIdAndUpdate(audit.user, {
      $inc: { totalAudits: 1 },
      $max: { bestAuraScore: score },
    });

    // Award career points to Student profile based on Aura Score
    const student = await Student.findOne({ userId: audit.user });
    if (student) {
      // Points: base 20 + bonus for score tiers
      let points = 20;
      let reason = `Resume Audit — Aura Score ${score}`;
      if (score >= 80) { points = 50; reason = `Excellent Audit — Aura Score ${score} 🎉`; }
      else if (score >= 60) { points = 35; reason = `Good Audit — Aura Score ${score}`; }

      student.careerPoints.total += points;
      student.careerPoints.history.push({ points, reason });

      // Sync extracted skills into the student profile — every skill the
      // resume shows, not just the first 5, so the profile actually reflects
      // the latest resume. Names are normalized against the skill catalog
      // (e.g. "ReactJS"/"React.js" both become "React") so the same real
      // skill doesn't fragment into several near-duplicate entries across
      // different resumes/phrasing. Never removes existing skills (manual
      // entries or ones from an earlier resume) since there's no reliable
      // signal that a skill not mentioned THIS time is actually gone.
      const extractedSkills = data.extracted_skills || [];
      for (const skill of extractedSkills) {
        const rawName = typeof skill === 'string' ? skill : skill.name;
        if (!rawName) continue;
        const matched = matchSkillToCatalog(rawName);
        const skillName = matched.name;
        if (!student.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase())) {
          student.skills.push({
            name: skillName,
            level: 'intermediate',
            category: matched.category,
            source: 'resume',
          });
        }
      }
      // Auto-fill profile location from the resume only if the student
      // never set one themselves — a manually-entered location always wins,
      // this only fills a genuine gap so live job search has something
      // better than a hardcoded default to work with.
      if (!student.location && data.location) {
        student.location = data.location;
      }

      student.calculateCareerReadinessScore();
      await student.save();

      // Create notification
      const notif = await Notification.create({
        user: audit.user,
        type: 'assessment_result',
        title: `Audit Complete — Score ${score}/100`,
        message: `Your resume scored ${score}/100. You earned ${points} career points! ${score >= 80 ? '🎉 Excellent work!' : score >= 60 ? '👍 Good effort!' : '💪 Keep improving!'}`,
        link: `/audit/${audit._id}`,
      });

      // Emit real-time notification via Socket.IO
      if (global.emitToUser) {
        global.emitToUser(audit.user.toString(), 'notification', notif);
        global.emitAuditUpdate(audit._id.toString(), { status: 'completed', score, points });
      }
    }

  } catch (err) {
    const message = getAxiosErrorMessage(err);
    console.warn('AI audit unavailable, completing fallback audit:', message);
    await Audit.findByIdAndUpdate(audit._id, buildFallbackAuditResult(message));
    if (global.emitAuditUpdate) {
      global.emitAuditUpdate(audit._id.toString(), { status: 'completed', fallback: true, error: message });
    }
    return;
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

// POST /api/audit/:id/retry — re-run real AI analysis on an audit that only
// has degraded fallback content (the AI engine was unavailable/rate-limited
// at the time it was first created). Audits are otherwise generated once and
// stored permanently, so without this a bad moment for the AI engine leaves
// that specific audit stuck showing placeholder content forever, even after
// the engine recovers — the user's only option was re-uploading from
// scratch. This reuses the same resume file already on Cloudinary.
exports.retryAudit = async (req, res) => {
  const audit = await Audit.findOne({ _id: req.params.id, user: req.user._id });
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  // errorMessage is the reliable signal — resumeMeta.fallback was silently
  // dropped by an incomplete schema for every audit created before this fix
  // (see Audit.js), so checking it alone would miss those permanently.
  const isFallback = !!audit.errorMessage || audit.resumeMeta?.fallback === true || audit.status === 'failed';
  if (!isFallback) {
    return res.status(400).json({ message: 'This audit already has full AI results — nothing to retry.' });
  }

  await Audit.findByIdAndUpdate(audit._id, { status: 'processing', errorMessage: null });
  res.status(202).json({ message: 'Retrying analysis' });

  const userGeminiKey = req.headers['x-user-gemini-key'] || null;
  processAuditAsync(audit, { path: audit.resumeUrl }, audit.dreamRole, userGeminiKey).catch(async (err) => {
    console.error('Audit retry failed:', getAxiosErrorMessage(err));
    await Audit.findByIdAndUpdate(audit._id, buildFallbackAuditResult(getAxiosErrorMessage(err)));
    if (global.emitAuditUpdate) {
      global.emitAuditUpdate(audit._id.toString(), { status: 'completed', fallback: true, error: getAxiosErrorMessage(err) });
    }
  });
};

// Must stay comfortably above the /analyze axios timeout (180s) used in
// processAuditAsync, so this only fires for audits truly abandoned by a
// server restart — not ones still legitimately in flight.
const STUCK_PROCESSING_TIMEOUT_MS = 4 * 60 * 1000;

exports.getAuditStatus = async (req, res) => {
  const audit = await Audit.findOne(
    { _id: req.params.id, user: req.user._id },
    'status errorMessage auraScore createdAt'
  );
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  // No queue/cron exists to retry an audit if the server restarts mid-processing
  // (fire-and-forget in processAuditAsync) — self-heal here instead of leaving
  // the client polling a status that will never change.
  if (audit.status === 'processing' && Date.now() - audit.createdAt.getTime() > STUCK_PROCESSING_TIMEOUT_MS) {
    const message = 'Audit processing took too long and was likely interrupted by a server restart.';
    await Audit.findByIdAndUpdate(audit._id, buildFallbackAuditResult(message));
    return res.json({ status: 'completed', score: buildFallbackAuditResult(message).auraScore, error: message });
  }

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
  const userGeminiKey = req.headers['x-user-gemini-key'];
  const aiResp = await axios.post(`${AI_ENGINE_URL}/roadmap`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(userGeminiKey ? { 'x-user-gemini-key': userGeminiKey } : {}),
    },
    timeout: 150000,
  }).catch((err) => {
    console.warn('Roadmap AI unavailable, using fallback:', getAxiosErrorMessage(err));
    return { data: makeFallbackRoadmap(dreamRole || skillStr, skills || skillStr, days) };
  });
  res.json(aiResp.data);
};

exports.generateInterview = async (req, res) => {
  const audit = await Audit.findById(req.params.id);
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  const { role } = req.body;
  const resumeText = audit.extractedExperience?.join('\n') || '';
  const formData = new URLSearchParams({
    resume_text: resumeText.slice(0, 3000),
    role: role || audit.dreamRole || 'Software Engineer',
    skills: (audit.extractedSkills || []).join(', '),
  });
  const aiResp = await axios.post(`${AI_ENGINE_URL}/interview`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(req.headers['x-user-gemini-key'] ? { 'x-user-gemini-key': req.headers['x-user-gemini-key'] } : {}),
    },
    timeout: 150000,
  }).catch((err) => {
    console.warn('Interview AI unavailable, using fallback:', getAxiosErrorMessage(err));
    return { data: makeFallbackInterview(role || audit.dreamRole) };
  });
  res.json(aiResp.data);
};

exports.enhanceBullet = async (req, res) => {
  const { original, roleContext } = req.body;
  const formData = new FormData();
  formData.append('original', original);
  formData.append('role_context', roleContext || '');
  const aiResp = await axios.post(`${AI_ENGINE_URL}/enhance-bullet`, formData, {
    headers: {
      ...formData.getHeaders(),
      ...(req.headers['x-user-gemini-key'] ? { 'x-user-gemini-key': req.headers['x-user-gemini-key'] } : {}),
    },
  }).catch((err) => {
    console.warn('Bullet enhancement AI unavailable, using fallback:', getAxiosErrorMessage(err));
    return { data: makeFallbackBulletEnhancement(original) };
  });
  res.json(aiResp.data);
};

// PATCH /api/audit/:id/redlines — batch-save which redlines the user accepted.
// Explicit save step (not per-click) so a burst of toggles is one write, and
// so "accepted" state survives a page refresh (previously local-state-only).
exports.saveRedlineAcceptance = async (req, res) => {
  const { acceptedLineIndexes } = req.body;
  if (!Array.isArray(acceptedLineIndexes)) {
    return res.status(400).json({ message: 'acceptedLineIndexes must be an array' });
  }

  const audit = await Audit.findOne({ _id: req.params.id, user: req.user._id });
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  const acceptedSet = new Set(acceptedLineIndexes.map(Number));
  audit.redlines.forEach((r) => {
    r.accepted = acceptedSet.has(r.line_index);
  });
  await audit.save();

  res.json({ redlines: audit.redlines });
};

// GET /api/audit/:id/download-edited — re-fetches the original PDF from
// Cloudinary, applies accepted redlines in place via the AI engine's
// PyMuPDF-based editor, and streams the result back as a file download.
exports.downloadEditedResume = async (req, res) => {
  const audit = await Audit.findOne({ _id: req.params.id, user: req.user._id });
  if (!audit) return res.status(404).json({ message: 'Audit not found' });

  const acceptedRedlines = (audit.redlines || []).filter((r) => r.accepted);
  if (acceptedRedlines.length === 0) {
    return res.status(400).json({ message: 'Accept at least one suggestion before downloading.' });
  }

  const pdfResponse = await axios.get(audit.resumeUrl, { responseType: 'arraybuffer', timeout: 30000 });
  const pdfBuffer = Buffer.from(pdfResponse.data);

  const formData = new FormData();
  formData.append('file', pdfBuffer, { filename: 'resume.pdf', contentType: 'application/pdf' });
  formData.append('edits', JSON.stringify(
    acceptedRedlines.map((r) => ({ original: r.original, suggestion: r.suggestion }))
  ));

  let aiResp;
  try {
    aiResp = await axios.post(`${AI_ENGINE_URL}/edit-resume`, formData, {
      headers: formData.getHeaders(),
      timeout: 60000,
    });
  } catch (err) {
    return res.status(502).json({ message: `Could not generate the edited resume: ${getAxiosErrorMessage(err)}` });
  }

  const { pdf_base64, applied = [], skipped = [] } = aiResp.data;
  if (!pdf_base64) return res.status(502).json({ message: 'AI engine returned no PDF.' });

  const editedBuffer = Buffer.from(pdf_base64, 'base64');
  const filename = `${(audit.originalFilename || 'resume').replace(/\.pdf$/i, '')}-edited.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': editedBuffer.length,
    'X-Edits-Applied': String(applied.length),
    'X-Edits-Skipped': String(skipped.length),
    'Access-Control-Expose-Headers': 'X-Edits-Applied, X-Edits-Skipped',
  });
  res.send(editedBuffer);
};
