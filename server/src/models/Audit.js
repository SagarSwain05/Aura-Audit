const mongoose = require('mongoose');

const redlineSchema = new mongoose.Schema({
  original: String,
  suggestion: String,
  reason: String,
  category: { type: String, enum: ['action_verb', 'quantification', 'keyword', 'impact', 'formatting'] },
  severity: { type: String, enum: ['critical', 'warning', 'improvement'] },
  line_index: Number,
  accepted: { type: Boolean, default: false },
}, { _id: false });

const auraScoreSchema = new mongoose.Schema({
  technical_density: Number,
  impact_quotient: Number,
  formatting_health: Number,
  ats_compatibility: Number,
  overall: Number,
}, { _id: false });

const jobMatchSchema = new mongoose.Schema({
  title: String,
  match_percentage: Number,
  matched_skills: [String],
  missing_skills: [String],
  salary_range: String,
  demand_level: String,
}, { _id: false });

const skillGapSchema = new mongoose.Schema({
  skill: String,
  importance: String,
  category: String,
  transferable_from: String,
}, { _id: false });

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String, required: true },
  resumePublicId: String,
  originalFilename: String,

  // AI Results
  auraScore: auraScoreSchema,
  redlines: [redlineSchema],
  jobMatches: [jobMatchSchema],
  extractedSkills: [String],
  extractedExperience: [String],
  dreamRole: String,
  gapAnalysis: {
    dream_role: String,
    readiness_score: Number,
    gaps: [skillGapSchema],
    strengths: [String],
    transferable_skills: [String],
  },
  marketDemand: { type: Map, of: Number },
  marketMeta: {
    trending: [String],
    hot_cities: { type: Map, of: [String] },
  },
  interviewQuestions: [{
    question: String,
    category: String,
    difficulty: String,
    hint: String,
  }],
  resumeMeta: {
    pages: Number,
    word_count: Number,
    metrics_count: {
      percentages: Number,
      numbers: Number,
      total_metrics: Number,
    },
    weak_verbs_count: Number,
  },

  // Status
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  errorMessage: String,

  // Privacy
  blindMode: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
