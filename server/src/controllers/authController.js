const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const University = require('../models/University');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  const { name, email, password, role, dreamRole, universityName, companyName } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({ name, email, password, role: role || 'student', dreamRole });

  // Create role-specific profile
  if (role === 'student') {
    await Student.create({ userId: user._id, name, email, dreamRole: dreamRole || '' });
  } else if (role === 'company') {
    await Company.create({ userId: user._id, name: companyName || name, email });
  } else if (role === 'tpo') {
    await University.create({ userId: user._id, name: universityName || name, email, tpoContact: name, tpoEmail: email });
  }

  const token = signToken(user._id);
  res.status(201).json({ token, user: user.toSafeJSON() });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

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
