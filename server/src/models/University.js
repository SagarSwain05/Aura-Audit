const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  // Present only once a real TPO account registers/claims this entry —
  // absence of userId is exactly what makes an entry an "unclaimed" catalog
  // placeholder a student can still affiliate with (unique+sparse means many
  // docs can share userId:null, but at most one doc per real account).
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  location: String,
  state: { type: String, default: '' },
  // "university" = degree-granting body; "college" = affiliated institution
  // whose degrees are awarded under a parent university's name (the common
  // Indian pattern — e.g. an engineering college affiliated with a state
  // technical university). parentUniversity is null for standalone/central/
  // state universities and for colleges with no modeled parent yet.
  type: { type: String, enum: ['university', 'college'], default: 'university' },
  parentUniversity: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },
  tpoContact: String,
  tpoEmail: String,
  batchYear: Number,
  avgAuraScore: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  topSkillGaps: [String],
  skillDistribution: { type: Map, of: Number }, // skill -> % of students who have it
  // Cached AI cohort analysis — regenerated on demand (not every page load,
  // since it's an LLM call), see GET /api/university/insights.
  aiInsights: {
    summary: { type: String, default: '' },
    actions: { type: mongoose.Schema.Types.Mixed, default: [] },
    generatedAt: Date,
  },
}, { timestamps: true });

universitySchema.index({ name: 'text' });
universitySchema.index({ state: 1 });
universitySchema.index({ parentUniversity: 1 });

module.exports = mongoose.model('University', universitySchema);
