const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  location: String,
  tpoContact: String,
  tpoEmail: String,
  batchYear: Number,
  avgAuraScore: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  topSkillGaps: [String],
  skillDistribution: { type: Map, of: Number }, // skill -> % of students who have it
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);
