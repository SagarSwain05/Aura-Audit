const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  skill: { type: String, required: true },
  currentLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
  targetLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'intermediate' },

  questions: [mongoose.Schema.Types.Mixed],
  answers: [{
    question_id: Number,
    answer: String,
    submittedAt: { type: Date, default: Date.now },
  }],

  evaluationResult: {
    totalScore: Number,
    totalPoints: Number,
    percentage: Number,
    passed: Boolean,
    passThreshold: { type: Number, default: 70 },
    results: [mongoose.Schema.Types.Mixed],
    correctCount: Number,
    totalQuestions: Number,
  },

  feedback: {
    personalizedMessage: String,
    strengths: [String],
    areasForImprovement: [String],
    recommendations: [mongoose.Schema.Types.Mixed],
    nextSteps: [String],
    estimatedReadinessDays: Number,
    motivationalQuote: String,
  },

  status: { type: String, enum: ['upcoming', 'in_progress', 'completed', 'evaluated'], default: 'upcoming' },
  certificateIssued: { type: Boolean, default: false },
  startedAt: Date,
  submittedAt: Date,
  evaluatedAt: Date,
}, { timestamps: true });

assessmentSchema.index({ student: 1, status: 1 });
assessmentSchema.index({ skill: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
