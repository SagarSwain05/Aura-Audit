const axios = require('axios');
const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// POST /api/assessment/generate
exports.generateAssessment = async (req, res) => {
  const { skill, currentLevel, targetLevel } = req.body;
  if (!skill) return res.status(400).json({ message: 'skill is required' });

  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  const aiRes = await axios.post(`${AI}/api/v1/assessment/generate`, {
    skill, current_level: currentLevel || 'beginner', target_level: targetLevel || 'intermediate',
  });
  const { questions, total_points } = aiRes.data;

  const assessment = await Assessment.create({
    student: student._id,
    skill,
    currentLevel: currentLevel || 'beginner',
    targetLevel: targetLevel || 'intermediate',
    questions,
    status: 'in_progress',
    startedAt: new Date(),
  });

  res.status(201).json({ assessmentId: assessment._id, questions, total_points });
};

// POST /api/assessment/:id/submit
exports.submitAssessment = async (req, res) => {
  const { answers } = req.body;
  const assessment = await Assessment.findById(req.params.id);
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

  // Evaluate via AI
  const aiRes = await axios.post(`${AI}/api/v1/assessment/evaluate`, {
    questions: assessment.questions,
    answers: answersArray,
    skill: assessment.skill,
    current_level: assessment.currentLevel,
    target_level: assessment.targetLevel,
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
  assessment.status = 'evaluated';
  assessment.evaluatedAt = new Date();

  // Award career points
  const student = await Student.findById(assessment.student);
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
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return res.status(404).json({ message: 'Not found' });
  res.json({ assessment });
};
