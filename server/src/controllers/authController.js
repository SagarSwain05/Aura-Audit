const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const University = require('../models/University');
const { sendOTPEmail, sendResetPasswordEmail } = require('../services/emailService');

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

  // Send OTP email — roll back user+profile if it fails
  try {
    await sendOTPEmail(email, name, otp);
  } catch (emailErr) {
    // Roll back
    await User.findByIdAndDelete(user._id);
    if (role === 'student') await Student.deleteOne({ userId: user._id });
    else if (role === 'company') await Company.deleteOne({ userId: user._id });
    else if (role === 'tpo') await University.deleteOne({ userId: user._id });

    if (emailErr.message === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({
        message: 'Email service is not configured on the server. Please contact the admin.',
      });
    }
    console.error('Email send error:', emailErr.message);
    return res.status(502).json({
      message: 'Failed to send verification email. Check your email address and try again.',
    });
  }

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

// PUT /api/auth/password  (logged-in user, requires current password)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }

  const user = await User.findById(req.user._id);
  const valid = await user.comparePassword(currentPassword);
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

  user.password = newPassword; // pre-save hook will hash it
  await user.save({ validateBeforeSave: false });
  res.json({ message: 'Password updated successfully' });
};

// DELETE /api/auth/account  (logged-in user, deletes all their data)
exports.deleteAccount = async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;

  await User.findByIdAndDelete(userId);
  if (role === 'student') await Student.deleteOne({ userId });
  else if (role === 'company') await Company.deleteOne({ userId });
  else if (role === 'tpo') await University.deleteOne({ userId });

  res.json({ message: 'Account deleted' });
};

// POST /api/auth/forgot-password  (send OTP to email)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  // Always return success to prevent email enumeration attacks
  if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

  const otp = generateOTP();
  user.emailOTP = otp;
  user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await user.save({ validateBeforeSave: false });

  try {
    await sendResetPasswordEmail(email, user.name, otp);
  } catch (err) {
    console.error('Reset email error:', err.message);
    return res.status(502).json({ message: 'Failed to send reset email. Please try again.' });
  }

  res.json({ message: 'If that email exists, a reset code has been sent.' });
};

// POST /api/auth/reset-password  (verify OTP + set new password)
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return res.status(400).json({ message: 'Invalid or expired reset code' });

  if (!user.emailOTP || user.emailOTP !== otp) {
    return res.status(400).json({ message: 'Invalid reset code' });
  }
  if (user.emailOTPExpiry && user.emailOTPExpiry < new Date()) {
    return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
  }

  user.password = newPassword; // pre-save hook will hash it
  user.emailOTP = null;
  user.emailOTPExpiry = null;
  await user.save({ validateBeforeSave: false });

  res.json({ message: 'Password reset successfully. You can now sign in.' });
};
