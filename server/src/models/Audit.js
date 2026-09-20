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
  // Plain Mixed objects, not Mongoose Map — skill names commonly contain
  // dots (e.g. "Node.js", "ASP.NET"), which Mongoose Map keys reject outright,
  // silently failing the whole audit save.
  marketDemand: { type: mongoose.Schema.Types.Mixed, default: {} },
  marketMeta: {
    trending: [String],
    hot_cities: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  interviewQuestions: [{
    question: String,
    category: String,
    difficulty: String,
    hint: String,
  }],
  detectedLocation: { type: String, default: '' },
  resumeMeta: {
    pages: Number,
    word_count: Number,
    metrics_count: {
      percentages: Number,
      numbers: Number,
      total_metrics: Number,
    },
    weak_verbs_count: Number,
    // Previously missing from this sub-schema, so Mongoose silently
    // stripped it on save whenever buildFallbackAuditResult() set it —
    // every fallback audit persisted resumeMeta as {} instead of
    // {fallback: true}, which meant the "Retry Analysis" UI could never
    // detect a fallback audit at all. errorMessage (below) is the
    // reliable signal in the meantime and going forward.
    fallback: Boolean,
  },

  // Status
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  errorMessage: String,
  // When the CURRENT processing attempt began — distinct from createdAt
  // (fixed at first upload). A retry re-enters 'processing' on an audit
  // that may be hours old, so the stuck-processing self-heal in
  // getAuditStatus must measure from here, not from createdAt.
  processingStartedAt: { type: Date, default: Date.now },

  // Privacy
  blindMode: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
