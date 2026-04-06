const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  industry: { type: String, default: '' },
  website: { type: String, default: '' },
  location: { type: String, default: '' },
  about: { type: String, default: '' },
  size: { type: String, default: '' }, // e.g. "50-200"
  foundedYear: { type: Number },
  logo: { type: String, default: '' },
  phone: { type: String, default: '' },
  socialLinks: {
    linkedin: String,
    twitter: String,
  },

  // Verification / KYC
  isVerified: { type: Boolean, default: false },
  kycDocuments: [{
    docType: { type: String, enum: ['gst', 'cin', 'pan', 'moa', 'other'] },
    url: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewComment: String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Subscription
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  planExpiry: Date,
  jobPostsUsed: { type: Number, default: 0 },
  jobPostsLimit: { type: Number, default: 3 },

  // Stats
  stats: {
    totalHired: { type: Number, default: 0 },
    activeJobs: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
