const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  currentCompany: { type: String, default: '' },
  currentRole: { type: String, default: '' },
  experience: { type: Number, default: 0 }, // years
  skills: [String],
  isAvailableForMentorship: { type: Boolean, default: true },
  mentorshipAreas: [String],
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  bio: { type: String, default: '' },
  linkedinUrl: { type: String, default: '' },
  graduationYear: Number,
}, { timestamps: true });

module.exports = mongoose.model('Alumni', alumniSchema);
