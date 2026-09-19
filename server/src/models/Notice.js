const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, maxlength: 3000 },
  type: {
    type: String,
    enum: ['placement_drive', 'workshop', 'mock_test', 'deadline', 'general'],
    default: 'general',
  },
  company: { type: String, default: '' }, // for placement_drive notices
  eventDate: Date, // drive date / workshop date / deadline
  link: { type: String, default: '' }, // registration form, meeting link, etc.
  pinned: { type: Boolean, default: false },
}, { timestamps: true });

noticeSchema.index({ university: 1, createdAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
