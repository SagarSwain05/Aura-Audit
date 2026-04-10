const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const University = require('../models/University');
const { sendOTPEmail } = require('../services/emailService');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Strict email validation: must have chars@chars.chars (TLD required)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email?.trim());

exports.register = async (req, res) => {
  const { name, email, password, role, dreamRole, universityName, companyName } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address (e.g. you@example.com)' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    // If email exists but unverified, allow re-sending OTP
    if (!existing.isEmailVerified) {
      const otp = generateOTP();
      existing.emailOTP = otp;
      existing.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await existing.save({ validateBeforeSave: false });
      await sendOTPEmail(email, existing.name, otp);
      return res.status(200).json({ pendingVerification: true, email, message: 'OTP resent to your email' });
    }
    return res.status(409).json({ message: 'Email already registered' });
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  const user = await User.create({
    name, email, password,
    role: role || 'student',
    dreamRole,
    isEmailVerified: false,
    emailOTP: otp,
    emailOTPExpiry: otpExpiry,
  });

  // Create role-specific profile (even before verification so it's ready)
  if (role === 'student') {
    await Student.create({ userId: user._id, name, email, dreamRole: dreamRole || '' });
  } else if (role === 'company') {
    await Company.create({ userId: user._id, name: companyName || name, email });
  } else if (role === 'tpo') {
    await University.create({ userId: user._id, name: universityName || name, email, tpoContact: name, tpoEmail: email });
  }

  // Send OTP email
  await sendOTPEmail(email, name, otp);

  res.status(201).json({
    pendingVerification: true,
    email,
    message: 'Account created! Check your email for the verification code.',
  });
};

exports.verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.isEmailVerified) {
    // Already verified — just log them in
    const token = signToken(user._id);
    return res.json({ token, user: user.toSafeJSON() });
  }

  if (!user.emailOTP || user.emailOTP !== otp) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  if (user.emailOTPExpiry && user.emailOTPExpiry < new Date()) {
    return res.status(400).json({ message: 'Verification code has expired. Please register again.' });
  }

  // Mark as verified
  user.isEmailVerified = true;
  user.emailOTP = null;
  user.emailOTPExpiry = null;
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  res.json({ token, user: user.toSafeJSON(), message: 'Email verified successfully!' });
};

exports.resendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isEmailVerified) return res.status(400).json({ message: 'Email already verified' });

  const otp = generateOTP();
  user.emailOTP = otp;
  user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  await sendOTPEmail(email, user.name, otp);

  res.json({ message: 'New verification code sent to your email' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  const user = await User.findOne({ email: email?.trim().toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Login does NOT require email verification
  const token = signToken(user._id);
  res.json({ token, user: user.toSafeJSON() });
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
};

exports.updateProfile = async (req, res) => {
  const { name, dreamRole, linkedinUrl, githubUrl } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, dreamRole, linkedinUrl, githubUrl, profileComplete: true },
    { new: true, runValidators: true }
  ).select('-password');
  res.json({ user });
};
