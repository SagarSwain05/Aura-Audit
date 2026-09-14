const axios = require('axios');
const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { makeFallbackAssessment, makeFallbackEvaluation } = require('../utils/aiFallbacks');
const { matchSkillToCatalog } = require('../utils/skillCategorizer');

const LEVEL_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// POST /api/assessment/generate
exports.generateAssessment = async (req, res) => {
  const { skill, currentLevel, targetLevel } = req.body;
  if (!skill) return res.status(400).json({ message: 'skill is required' });

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const userGeminiKey = req.headers['x-user-gemini-key'];
  let aiData;
  try {
    const aiRes = await axios.post(`${AI}/api/v1/assessment/generate`, {
      skill, current_level: currentLevel || 'beginner', target_level: targetLevel || 'intermediate',
    }, {
      timeout: 60000,
      headers: userGeminiKey ? { 'x-user-gemini-key': userGeminiKey } : {},
    });
    aiData = aiRes.data;
  } catch (err) {
    console.warn('Assessment AI unavailable, using fallback:', err.message);
    aiData = makeFallbackAssessment(skill, currentLevel || 'beginner', targetLevel || 'intermediate');
  }
  const { questions, total_points } = aiData;

  const assessment = await Assessment.create({
    student: student._id,
    skill,
    currentLevel: currentLevel || 'beginner',
    targetLevel: targetLevel || 'intermediate',
    questions,
    status: 'in_progress',
    startedAt: new Date(),
    fallback: Boolean(aiData.fallback),
  });

  res.status(201).json({ assessmentId: assessment._id, questions, total_points, fallback: Boolean(aiData.fallback) });
};

// POST /api/assessment/:id/regenerate — re-run question generation for an
// assessment that only got the static offline fallback set (same skill/
// level, fresh questions), in place, before the student has started
// answering. Without this, an assessment created during a bad AI-engine
// moment is stuck with the same generic template forever.
exports.regenerateAssessment = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const assessment = await Assessment.findOne({ _id: req.params.id, student: student._id });
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  if (!assessment.fallback) {
    return res.status(400).json({ message: 'This assessment already has real AI-generated questions — nothing to regenerate.' });
  }
  if (assessment.status !== 'in_progress' || (assessment.answers || []).length > 0) {
    return res.status(400).json({ message: 'Cannot regenerate an assessment that already has submitted answers.' });
  }

  const userGeminiKey = req.headers['x-user-gemini-key'];
  let aiData;
  try {
    const aiRes = await axios.post(`${AI}/api/v1/assessment/generate`, {
      skill: assessment.skill, current_level: assessment.currentLevel, target_level: assessment.targetLevel,
    }, {
      timeout: 60000,
      headers: userGeminiKey ? { 'x-user-gemini-key': userGeminiKey } : {},
    });
    aiData = aiRes.data;
  } catch (err) {
    return res.status(502).json({ message: 'AI engine is still unavailable — please try again shortly.' });
  }

  assessment.questions = aiData.questions;
  assessment.fallback = Boolean(aiData.fallback);
  await assessment.save();

  res.json({ assessmentId: assessment._id, questions: assessment.questions, total_points: aiData.total_points, fallback: assessment.fallback });
};

// POST /api/assessment/:id/reevaluate — re-run grading on the already-
// submitted answers, for an assessment whose first evaluation fell back to
// offline partial-credit grading because the AI engine was unavailable.
exports.reevaluateAssessment = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const assessment = await Assessment.findOne({ _id: req.params.id, student: student._id });
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  if (!assessment.evaluationFallback) {
    return res.status(400).json({ message: 'This assessment already has a real AI evaluation — nothing to re-evaluate.' });
  }

  const answersArray = (assessment.answers || []).map((a) => ({ question_id: a.question_id, answer: a.answer || '' }));
  let aiRes;
  try {
    aiRes = await axios.post(`${AI}/api/v1/assessment/evaluate`, {
      questions: assessment.questions,
      answers: answersArray,
      skill: assessment.skill,
      current_level: assessment.currentLevel,
      target_level: assessment.targetLevel,
    }, {
      timeout: 60000,
      headers: req.headers['x-user-gemini-key'] ? { 'x-user-gemini-key': req.headers['x-user-gemini-key'] } : {},
    });
  } catch (err) {
    return res.status(502).json({ message: 'AI engine is still unavailable — please try again shortly.' });
  }

  const { evaluation, feedback } = aiRes.data;
  const wasPassed = assessment.evaluationResult?.passed;
  const evalResult = {
    totalScore:     evaluation.totalScore     ?? evaluation.total_score     ?? 0,
    totalPoints:    evaluation.totalPoints    ?? evaluation.total_points    ?? 100,
    percentage:     evaluation.percentage     ?? 0,
    passed:         evaluation.passed         ?? false,
    passThreshold:  evaluation.passThreshold  ?? evaluation.pass_threshold  ?? 70,
    results:        evaluation.results        ?? [],
    correctCount:   evaluation.correctCount   ?? evaluation.correct_count   ?? 0,
    totalQuestions: evaluation.totalQuestions ?? evaluation.total_questions ?? 0,
  };
  assessment.evaluationResult = evalResult;
  assessment.feedback = feedback;
  assessment.evaluationFallback = false;
  await assessment.save();

  // If the real grade newly crosses the pass line (the offline fallback
  // under-credits open-ended answers), retroactively verify the skill and
  // issue the certificate — the student shouldn't lose out just because the
  // first grading pass happened to be the degraded one.
  if (evalResult.passed && !wasPassed) {
    const fullStudent = await Student.findById(assessment.student);
    if (fullStudent && !assessment.certificateIssued) {
      assessment.certificateIssued = true;
      fullStudent.certifications.push({
        name: `${assessment.skill} — ${assessment.targetLevel.charAt(0).toUpperCase() + assessment.targetLevel.slice(1)} Level`,
        issuer: 'Aura-Audit AI Assessment',
        issueDate: new Date(),
      });
      const matched = matchSkillToCatalog(assessment.skill);
      const skillEntry = fullStudent.skills.find(s => s.name.toLowerCase() === matched.name.toLowerCase());
      if (skillEntry) {
        skillEntry.verified = true;
      } else {
        fullStudent.skills.push({ name: matched.name, level: assessment.targetLevel || 'intermediate', category: matched.category, source: 'assessment', verified: true });
      }
      await Promise.all([assessment.save(), fullStudent.save()]);
    }
  }

  res.json({ assessment, evaluation: evalResult, feedback });
};

// POST /api/assessment/:id/submit
exports.submitAssessment = async (req, res) => {
  const { answers } = req.body;
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const assessment = await Assessment.findOne({ _id: req.params.id, student: student._id });
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

  assessment.answers = answers;
  assessment.status = 'completed';
  assessment.submittedAt = new Date();
  await assessment.save();

  // Convert answers from {questionId: answerText} → [{question_id, answer}] for AI engine
  const answersArray = Object.entries(answers || {}).map(([question_id, answer]) => ({
    question_id,
    answer: answer || '',
  }));

  // Evaluate via AI (falls back to deterministic offline grading if the AI engine is down)
  const aiRes = await axios.post(`${AI}/api/v1/assessment/evaluate`, {
    questions: assessment.questions,
    answers: answersArray,
    skill: assessment.skill,
    current_level: assessment.currentLevel,
    target_level: assessment.targetLevel,
  }, {
    timeout: 60000,
    headers: req.headers['x-user-gemini-key'] ? { 'x-user-gemini-key': req.headers['x-user-gemini-key'] } : {},
  }).catch((err) => {
    console.warn('Assessment evaluation AI unavailable, using fallback grading:', err.message);
    return { data: makeFallbackEvaluation(assessment.questions, answersArray) };
  });

  const { evaluation, feedback } = aiRes.data;
  // Normalize evaluation keys: support both camelCase (new) and snake_case (legacy)
  const evalResult = {
    totalScore:     evaluation.totalScore     ?? evaluation.total_score     ?? 0,
    totalPoints:    evaluation.totalPoints    ?? evaluation.total_points    ?? 100,
    percentage:     evaluation.percentage     ?? 0,
    passed:         evaluation.passed         ?? false,
    passThreshold:  evaluation.passThreshold  ?? evaluation.pass_threshold  ?? 70,
    results:        evaluation.results        ?? [],
    correctCount:   evaluation.correctCount   ?? evaluation.correct_count   ?? 0,
    totalQuestions: evaluation.totalQuestions ?? evaluation.total_questions ?? 0,
  };
  assessment.evaluationResult = evalResult;
  assessment.feedback = feedback;
  assessment.evaluationFallback = Boolean(aiRes.data.fallback);
  assessment.status = 'evaluated';
  assessment.evaluatedAt = new Date();

  // Award career points (`student` already fetched above via req.user, and
  // is guaranteed to match assessment.student since the query was scoped to it)
  const points = evalResult.passed ? 50 : 20;
  student.careerPoints.total += points;
  student.careerPoints.history.push({ points, reason: `Assessment: ${assessment.skill} (${evalResult.percentage}%)` });
  student.activityStats.certificationsEarned += evalResult.passed ? 1 : 0;
  if (evalResult.passed) {
    assessment.certificateIssued = true;
    student.certifications.push({
      name: `${assessment.skill} — ${assessment.targetLevel.charAt(0).toUpperCase() + assessment.targetLevel.slice(1)} Level`,
      issuer: 'Aura-Audit AI Assessment',
      issueDate: new Date(),
    });

    // A skill only becomes "verified" by passing an assessment for it — this
    // is the sole verification path. Match against the catalog so it lands
    // on the same canonical skill entry the rest of the profile uses.
    const matched = matchSkillToCatalog(assessment.skill);
    const skillEntry = student.skills.find(s => s.name.toLowerCase() === matched.name.toLowerCase());
    if (skillEntry) {
      skillEntry.verified = true;
      const currentIdx = LEVEL_ORDER.indexOf(skillEntry.level);
      const targetIdx = LEVEL_ORDER.indexOf(assessment.targetLevel);
      if (targetIdx > currentIdx) skillEntry.level = assessment.targetLevel;
    } else {
      student.skills.push({
        name: matched.name,
        level: assessment.targetLevel || 'intermediate',
        category: matched.category,
        source: 'assessment',
        verified: true,
      });
    }
  }
  student.calculateCareerReadinessScore();
  await Promise.all([assessment.save(), student.save()]);

  // Notify
  await Notification.create({
    user: req.user._id,
    type: 'assessment_result',
    title: `Assessment Result: ${assessment.skill}`,
    message: `You scored ${evalResult.percentage}%${evalResult.passed ? ' — Certificate issued!' : '. Keep practising!'}`,
    link: `/dashboard/student/assessments`,
  });

  res.json({ assessment, evaluation: evalResult, feedback });
};

// GET /api/assessment
exports.getAssessments = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Not found' });

  const { status } = req.query;
  const filter = { student: student._id };
  if (status) filter.status = status;

  const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
  res.json({ assessments });
};

// GET /api/assessment/:id
exports.getAssessmentById = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Not found' });

  const assessment = await Assessment.findOne({ _id: req.params.id, student: student._id });
  if (!assessment) return res.status(404).json({ message: 'Not found' });
  res.json({ assessment });
};
