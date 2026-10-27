const router = require('express').Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try { res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50)); } catch (e) { next(e); }
});
router.get('/unread-count', auth, async (req, res, next) => {
  try { res.json({ count: await Notification.countDocuments({ user: req.user._id, read: false }) }); } catch (e) { next(e); }
});
router.post('/read-all', auth, async (req, res, next) => {
  try { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); } catch (e) { next(e); }
});
module.exports = router;
