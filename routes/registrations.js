const router = require('express').Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const QRCode = require('qrcode');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { auth, role } = require('../middleware/auth');

const bad = (res, message, code = 400) => res.status(code).json({ message });
const newTicketId = () => 'EVT-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
const startOfToday = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

// Register for an event
router.post('/', auth, role('attendee'), async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const ev = mongoose.isValidObjectId(eventId) ? await Event.findById(eventId) : null;
    if (!ev) return bad(res, 'Event not found', 404);                                   // does the event exist?
    if (ev.status !== 'published') return bad(res, 'Registration is not open for this event');
    if (ev.date < startOfToday()) return bad(res, 'This event has already taken place');
    if (ev.deadline && new Date() > ev.deadline) return bad(res, 'The registration deadline has passed'); // still open?

    let reg = await Registration.findOne({ user: req.user._id, event: ev._id });
    if (reg && reg.status === 'confirmed') return bad(res, 'You are already registered for this event', 409);

    // Atomic capacity check: increments only if a seat is still free, so concurrent requests can't overbook
    const updated = await Event.findOneAndUpdate(
      { _id: ev._id, status: 'published', $expr: { $lt: ['$registered', '$capacity'] } },
      { $inc: { registered: 1 } }, { new: true }
    );
    if (!updated) return bad(res, 'Sorry, this event is sold out', 409);

    try {
      if (reg) { reg.status = 'confirmed'; reg.checkedIn = false; reg.ticketId = newTicketId(); await reg.save(); }
      else reg = await Registration.create({ user: req.user._id, event: ev._id, ticketId: newTicketId() });
    } catch (e) {
      await Event.updateOne({ _id: ev._id }, { $inc: { registered: -1 } }); // roll back the seat
      throw e;
    }

    const left = updated.capacity - updated.registered;
    await Notification.create([
      { user: req.user._id, type: 'success', message: '✅ Registration successful!' },
      { user: req.user._id, type: 'ticket', message: `🎟️ Your ticket for ${ev.title} is ready.` }
    ]);
    if (left === 0) await Notification.create({ user: ev.organizer, type: 'warning', message: `🔥 "${ev.title}" is now SOLD OUT.` });
    else if (left <= 5) await Notification.create({ user: ev.organizer, type: 'warning', message: `⚠️ Only ${left} seats remaining for "${ev.title}".` });

    res.status(201).json(reg);
  } catch (e) { next(e); }
});

router.get('/mine', auth, role('attendee'), async (req, res, next) => {
  try {
    const regs = await Registration.find({ user: req.user._id }).populate('event').sort('-createdAt');
    res.json(regs.filter((r) => r.event));
  } catch (e) { next(e); }
});

// Ticket with QR code
router.get('/:id/ticket', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Ticket not found', 404);
    const reg = await Registration.findById(req.params.id).populate('event').populate('user', 'name email');
    if (!reg || !reg.event) return bad(res, 'Ticket not found', 404);
    const mine = String(reg.user._id) === String(req.user._id);
    const organizer = String(reg.event.organizer) === String(req.user._id);
    if (!mine && !organizer) return bad(res, 'Not allowed', 403);
    const qr = await QRCode.toDataURL(reg.ticketId, { margin: 1, width: 220 });
    res.json({ registration: reg, qr });
  } catch (e) { next(e); }
});

// Cancel registration (frees the seat)
router.delete('/:id', auth, role('attendee'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Registration not found', 404);
    const reg = await Registration.findOne({ _id: req.params.id, user: req.user._id });
    if (!reg) return bad(res, 'Registration not found', 404);
    if (reg.status === 'cancelled') return bad(res, 'Already cancelled');
    reg.status = 'cancelled'; await reg.save();
    await Event.updateOne({ _id: reg.event, registered: { $gt: 0 } }, { $inc: { registered: -1 } });
    res.json({ message: 'Registration cancelled' });
  } catch (e) { next(e); }
});

module.exports = router;
