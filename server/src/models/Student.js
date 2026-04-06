const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], default: 'beginner' },
  verified: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const certificationSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  issueDate: Date,
  expiryDate: Date,
  credentialId: String,
  credentialUrl: String,
}, { _id: true });

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  techStack: [String],
  githubUrl: String,
  liveUrl: String,
  startDate: Date,
  endDate: Date,
  achievements: [String],
}, { _id: true });

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  // Academic
  department: { type: String, default: '' },
  rollNumber: { type: String, default: '' },
  year: { type: Number, default: 1 },
  semester: { type: Number, default: 1 },
  cgpa: { type: Number, default: 0, min: 0, max: 10 },
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },

  // Skills & Profile
  skills: [skillSchema],
  certifications: [certificationSchema],
  projects: [projectSchema],
  socialLinks: {
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  dreamRole: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  profilePic: { type: String, default: '' },

  // Career Metrics
  careerReadinessScore: { type: Number, default: 0 },
  careerPoints: {
    total: { type: Number, default: 0 },
    history: [{
      points: Number,
      reason: String,
      timestamp: { type: Date, default: Date.now },
    }],
  },

  // Gamification
  badges: [{
    type: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] },
    name: String,
    earnedAt: { type: Date, default: Date.now },
    icon: String,
  }],
  rank: {
    overall: { type: Number, default: 0 },
    branch: { type: Number, default: 0 },
    college: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  activityStats: {
    coursesCompleted: { type: Number, default: 0 },
    interviewsAttended: { type: Number, default: 0 },
    certificationsEarned: { type: Number, default: 0 },
    jobsApplied: { type: Number, default: 0 },
    alumniConnections: { type: Number, default: 0 },
    loginStreak: { type: Number, default: 0 },
    lastLoginDate: Date,
  },

  // Placement
  isPlaced: { type: Boolean, default: false },
  placementDetails: {
    companyName: String,
    jobRole: String,
    package: Number, // LPA
    joiningDate: Date,
  },

  // Resume
  resume: { url: String, uploadedAt: Date },

  // Account
  isTemporaryPassword: { type: Boolean, default: false },
  temporaryPassword: { type: String, select: false },
  profileCompleted: { type: Boolean, default: false },
}, { timestamps: true });

// ── Methods ───────────────────────────────────────────────
studentSchema.methods.calculateCareerReadinessScore = function () {
  let score = 0;
  score += (this.cgpa / 10) * 30;                                         // CGPA: 30%
  score += Math.min(this.skills.length / 8, 1) * 50;                      // Skills: 50%
  score += Math.min(this.certifications.length / 2, 1) * 20;              // Certs: 20%
  const s = Math.round(Math.min(score, 100));
  this.careerReadinessScore = s;
  return s;
};

studentSchema.methods.addCareerPoints = async function (points, reason) {
  this.careerPoints.total += points;
  this.careerPoints.history.push({ points, reason });
  await this.save();
};

studentSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.temporaryPassword;
  delete obj.isTemporaryPassword;
  return obj;
};

module.exports = mongoose.model('Student', studentSchema);
