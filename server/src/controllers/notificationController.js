const Notification = require('../models/Notification');

exports.getAll = async (req, res) => {
  const { page = 1, limit = 20, unread } = req.query;
  const filter = { user: req.user._id };
  if (unread === 'true') filter.read = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications, unreadCount });
};

exports.markRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true, readAt: new Date() }
  );
  res.json({ success: true });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true, readAt: new Date() });
  res.json({ success: true });
};

exports.deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
};
