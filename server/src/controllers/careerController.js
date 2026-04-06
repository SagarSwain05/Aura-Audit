const axios = require('axios');
const Student = require('../models/Student');

const AI = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// GET /api/career/recommendations
exports.getCareerRecommendations = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student not found' });

  try {
    const aiRes = await axios.post(`${AI}/api/v1/jobs/careers`, {
      skills: student.skills.map(s => ({ name: s.name, level: s.level })),
      cgpa: student.cgpa,
      top_n: 6,
    });
    return res.json({ recommendations: aiRes.data.recommendations || [] });
  } catch {
    const { recommend_careers_fallback } = require('../utils/careerUtils');
    return res.json({ recommendations: recommend_careers_fallback(student.skills, student.cgpa) });
  }
};

// POST /api/career/roadmap — generate role-based roadmap with resources
exports.getCareerRoadmap = async (req, res) => {
  const { role, days = 30 } = req.body;
  if (!role) return res.status(400).json({ message: 'role is required' });

  const student = await Student.findOne({ userId: req.user._id });
  const skills = student?.skills?.map(s => s.name) || [];

  try {
    // Use auditor's roadmap generation with all student skills
    const formData = new URLSearchParams({
      skill: skills.join(', ') || role,
      dream_role: role,
      days: String(days),
    });
    const aiRes = await axios.post(`${AI}/roadmap`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 60000,
    });
    return res.json(aiRes.data);
  } catch (e) {
    return res.status(500).json({ message: 'Roadmap generation failed', error: e.message });
  }
};

// GET /api/career/interview-questions
exports.getInterviewQuestions = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Not found' });
  const auditId = req.query.auditId;
  if (auditId) {
    const { generateInterview } = require('./auditController');
    req.params = { id: auditId };
    req.body = { role: req.query.role };
    return generateInterview(req, res);
  }
  res.status(400).json({ message: 'auditId required' });
};
