const Alumni = require('../models/Alumni');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const ConnectionRequest = require('../models/ConnectionRequest');

const RECENTLY_ACTIVE_DAYS = 30;

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/alumni/me — my own alumni profile (or defaults to prefill the edit form)
exports.getMyAlumniProfile = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });

  const alumni = await Alumni.findOne({ student: student._id });
  res.json({
    alumni: alumni || null,
    defaults: {
      skills: student.skills.map((s) => s.name),
      linkedinUrl: student.socialLinks?.linkedin || req.user.linkedinUrl || '',
      bio: student.bio || '',
    },
  });
};

// PUT /api/alumni/me — create or update my alumni profile (self-declared "I've graduated / here's my career now")
exports.upsertMyAlumniProfile = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });

  const fields = ['currentCompany', 'currentRole', 'graduationYear', 'experience',
                   'skills', 'isAvailableForMentorship', 'mentorshipAreas', 'bio', 'linkedinUrl'];
  const updates = {};
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const alumni = await Alumni.findOneAndUpdate(
    { student: student._id },
    { $set: updates },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ alumni });
};

// GET /api/alumni/directory — search/filter other students' alumni profiles
exports.getDirectory = async (req, res) => {
  const student = await Student.findOne({ userId: req.user._id });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });

  const { company, role, location, skill, search, mentorOnly, scope = 'university' } = req.query;

  const alumniQuery = {};
  if (scope === 'university' && student.university) {
    const sameUniStudentIds = await Student.find({ university: student.university }).distinct('_id');
    alumniQuery.student = { $in: sameUniStudentIds, $ne: student._id };
  } else {
    alumniQuery.student = { $ne: student._id };
  }
  if (mentorOnly === 'true') alumniQuery.isAvailableForMentorship = true;
  if (company) alumniQuery.currentCompany = new RegExp(escapeRegex(company), 'i');
  if (role) alumniQuery.currentRole = new RegExp(escapeRegex(role), 'i');
  if (skill) alumniQuery.skills = new RegExp(escapeRegex(skill), 'i');

  let results = await Alumni.find(alumniQuery)
    .populate({
      path: 'student',
      select: 'userId name profilePic location department year socialLinks email activityStats.lastLoginDate university',
      populate: { path: 'university', select: 'name' },
    })
    .sort({ updatedAt: -1 })
    .lean();

  // Drop any Alumni doc whose linked Student got deleted since (orphan safety)
  results = results.filter((a) => a.student);

  if (location) {
    const loc = location.toLowerCase();
    results = results.filter((a) => (a.student.location || '').toLowerCase().includes(loc));
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((a) =>
      (a.student.name || '').toLowerCase().includes(q) ||
      (a.currentCompany || '').toLowerCase().includes(q) ||
      (a.currentRole || '').toLowerCase().includes(q)
    );
  }

  // Connection status relative to the logged-in user, computed in one query
  const targetUserIds = results.map((a) => a.student.userId).filter(Boolean);
  const requests = await ConnectionRequest.find({
    $or: [
      { from: req.user._id, to: { $in: targetUserIds } },
      { to: req.user._id, from: { $in: targetUserIds } },
    ],
  }).lean();

  const statusFor = (theirUserId) => {
    const mine = String(req.user._id);
    const theirs = String(theirUserId);
    const accepted = requests.find((r) => r.status === 'accepted' &&
      ((String(r.from) === mine && String(r.to) === theirs) || (String(r.from) === theirs && String(r.to) === mine)));
    if (accepted) return { status: 'connected' };
    const sent = requests.find((r) => r.status === 'pending' && String(r.from) === mine && String(r.to) === theirs);
    if (sent) return { status: 'pending_sent', requestId: sent._id };
    const received = requests.find((r) => r.status === 'pending' && String(r.from) === theirs && String(r.to) === mine);
    if (received) return { status: 'pending_received', requestId: received._id };
    return { status: 'none' };
  };

  const now = Date.now();
  const activeCutoff = RECENTLY_ACTIVE_DAYS * 24 * 60 * 60 * 1000;

  const alumni = results.map((a) => {
    const conn = statusFor(a.student.userId);
    return {
      id: a._id,
      studentId: a.student._id,
      name: a.student.name,
      profilePic: a.student.profilePic || '',
      university: a.student.university?.name || '',
      department: a.student.department || '',
      graduationYear: a.graduationYear || null,
      currentCompany: a.currentCompany || '',
      currentRole: a.currentRole || '',
      experience: a.experience || 0,
      location: a.student.location || '',
      skills: a.skills || [],
      bio: a.bio || '',
      isAvailableForMentorship: !!a.isAvailableForMentorship,
      mentorshipAreas: a.mentorshipAreas || [],
      linkedinUrl: a.linkedinUrl || a.student.socialLinks?.linkedin || '',
      recentlyActive: !!(a.student.activityStats?.lastLoginDate &&
        (now - new Date(a.student.activityStats.lastLoginDate).getTime()) < activeCutoff),
      connectionStatus: conn.status,
      connectionRequestId: conn.requestId || null,
      // Email only revealed once genuinely connected — mirrors how real alumni
      // portals unlock contact info after a mutual accept, not before.
      email: conn.status === 'connected' ? a.student.email : null,
    };
  });

  res.json({ alumni, total: alumni.length, scope });
};

// POST /api/alumni/connect/:alumniId — send a connection request with a short intro note
exports.sendConnectionRequest = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'A short intro note is required — a note-less request is far less likely to get a reply.' });
  }
  if (message.length > 300) {
    return res.status(400).json({ message: 'Keep your note under 300 characters — short, warm messages get better responses.' });
  }

  const myStudent = await Student.findOne({ userId: req.user._id });
  if (!myStudent) return res.status(404).json({ message: 'Student profile not found' });

  const target = await Alumni.findById(req.params.alumniId).populate('student', 'userId name');
  if (!target || !target.student) return res.status(404).json({ message: 'Alumni profile not found' });
  if (String(target.student._id) === String(myStudent._id)) {
    return res.status(400).json({ message: "You can't connect with yourself" });
  }

  const theirUserId = target.student.userId;

  const reverseExisting = await ConnectionRequest.findOne({ from: theirUserId, to: req.user._id, status: 'pending' });
  if (reverseExisting) {
    return res.status(409).json({ message: `${target.student.name} already sent you a request — check your Requests tab to respond.` });
  }

  let request = await ConnectionRequest.findOne({ from: req.user._id, to: theirUserId });
  if (request) {
    if (request.status === 'pending') return res.status(409).json({ message: 'Request already sent — waiting on a response.' });
    if (request.status === 'accepted') return res.status(409).json({ message: 'You are already connected.' });
    // Previously declined — allow a fresh attempt
    request.status = 'pending';
    request.message = message.trim();
    request.respondedAt = undefined;
    await request.save();
  } else {
    request = await ConnectionRequest.create({ from: req.user._id, to: theirUserId, message: message.trim() });
  }

  const notif = await Notification.create({
    user: theirUserId,
    from: req.user._id,
    type: 'connection_request',
    title: 'New connection request',
    message: `${myStudent.name} wants to connect: "${message.trim()}"`,
    link: '/student/alumni?tab=requests',
  }).catch(() => null);
  if (notif && global.emitToUser) global.emitToUser(theirUserId.toString(), 'notification', notif);

  res.status(201).json({ request });
};

// GET /api/alumni/requests — incoming (pending, need my response) + outgoing (sent by me)
exports.getRequests = async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    ConnectionRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
      .lean(),
    ConnectionRequest.find({ from: req.user._id })
      .populate('to', 'name email')
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  res.json({ incoming, outgoing });
};

// PUT /api/alumni/requests/:id/respond — accept or decline an incoming request
exports.respondToRequest = async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ message: "action must be 'accept' or 'decline'" });
  }

  const request = await ConnectionRequest.findOne({ _id: req.params.id, to: req.user._id, status: 'pending' });
  if (!request) return res.status(404).json({ message: 'Request not found or already responded to' });

  request.status = action === 'accept' ? 'accepted' : 'declined';
  request.respondedAt = new Date();
  await request.save();

  if (action === 'accept') {
    const [myStudent, theirStudent] = await Promise.all([
      Student.findOne({ userId: req.user._id }),
      Student.findOne({ userId: request.from }),
    ]);

    await Promise.all([
      myStudent && Student.updateOne({ _id: myStudent._id }, { $inc: { 'activityStats.alumniConnections': 1 } }),
      theirStudent && Student.updateOne({ _id: theirStudent._id }, { $inc: { 'activityStats.alumniConnections': 1 } }),
      myStudent && Alumni.updateOne({ student: myStudent._id }, { $addToSet: { connections: theirStudent?._id } }).catch(() => {}),
      theirStudent && Alumni.updateOne({ student: theirStudent._id }, { $addToSet: { connections: myStudent?._id } }).catch(() => {}),
    ]);

    const notif = await Notification.create({
      user: request.from,
      from: req.user._id,
      type: 'connection_accepted',
      title: 'Connection accepted',
      message: `${myStudent?.name || 'Someone'} accepted your connection request. You can now see their contact details.`,
      link: '/student/alumni?tab=requests',
    }).catch(() => null);
    if (notif && global.emitToUser) global.emitToUser(request.from.toString(), 'notification', notif);
  }

  res.json({ request });
};
