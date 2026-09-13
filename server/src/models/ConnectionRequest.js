const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, maxlength: 300 },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: Date,
}, { timestamps: true });

// A given requester can only have one live (pending/accepted) request to the same person
connectionRequestSchema.index({ from: 1, to: 1 }, { unique: true });
connectionRequestSchema.index({ to: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
