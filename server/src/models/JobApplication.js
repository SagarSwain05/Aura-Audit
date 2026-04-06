const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  resumeUrl: String,
  coverLetter: String,
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview_scheduled', 'selected', 'rejected', 'on_hold', 'withdrawn'],
    default: 'applied',
  },
  matchScore: { type: Number, default: 0 },
  interviewDate: Date,
  interviewFeedback: {
    rating: { type: Number, min: 1, max: 5 },
    notes: String,
    interviewer: String,
  },
  offerDetails: {
    salary: Number,
    role: String,
    joiningDate: Date,
    accepted: Boolean,
  },
  notes: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

jobApplicationSchema.index({ student: 1, job: 1 }, { unique: true });
jobApplicationSchema.index({ job: 1, status: 1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
