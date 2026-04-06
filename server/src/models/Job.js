const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  requirements: [String],
  skills: [String],
  location: { type: String, default: 'Remote' },
  workMode: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'hybrid' },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
  jobType: { type: String, enum: ['Intern', 'Fresher', 'Experienced'], default: 'Fresher' },
  experience: { type: String, default: '0-1 years' },
  salary: { type: String, default: '' },
  openings: { type: Number, default: 1 },
  minCGPA: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'draft', 'closed'], default: 'draft' },
  applicationsCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  deadline: Date,

  // Drive / Campus
  isDrive: { type: Boolean, default: false },
  targetUniversities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'University' }],
}, { timestamps: true });

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ skills: 1 });

module.exports = mongoose.model('Job', jobSchema);
