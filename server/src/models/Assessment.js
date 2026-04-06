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
    total_score: Number,
    total_points: Number,
    percentage: Number,
    passed: Boolean,
    pass_threshold: { type: Number, default: 70 },
    results: [mongoose.Schema.Types.Mixed],
    correct_count: Number,
    total_questions: Number,
  },

  feedback: {
    personalized_message: String,
    strengths: [String],
    areas_for_improvement: [String],
    recommendations: [mongoose.Schema.Types.Mixed],
    next_steps: [String],
    estimated_readiness_days: Number,
    motivational_quote: String,
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
