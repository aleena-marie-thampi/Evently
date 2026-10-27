const router = require('express').Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { auth, optionalAuth, role } = require('../middleware/auth');
const upload = require('../middleware/upload');

const rx = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const today = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };
const bad = (res, message, code = 400) => res.status(code).json({ message });

// registrations per day for the last N days (zero-filled)
async function daily(match, days = 7) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await Registration.aggregate([
    { $match: { ...match, status: 'confirmed', createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since); d.setUTCDate(d.getUTCDate() + i);
    const k = d.toISOString().slice(0, 10); return { date: k, count: map[k] || 0 };
  });
}
const SORTS = { upcoming: { date: 1, startTime: 1 }, newest: { createdAt: -1 }, popular: { registered: -1, date: 1 } };

function fromBody(b) {
  return {
    title: b.title, description: b.description, category: b.category,
    date: b.date, startTime: b.startTime, endTime: b.endTime,
    venue: b.venue, address: b.address, location: b.location,
    capacity: Number(b.capacity),
    deadline: b.deadline ? new Date(b.deadline + 'T23:59:59Z') : undefined,
    status: b.status === 'draft' ? 'draft' : 'published'
  };
}
function validate(d) {
  if (d.endTime && d.startTime && d.endTime <= d.startTime) return 'End time must be after start time';
  if (d.deadline && d.date && d.deadline > new Date(new Date(d.date).getTime() + 86399000)) return 'Registration deadline must be on or before the event date';
  if (!Number.isInteger(d.capacity) || d.capacity < 1) return 'Capacity must be a whole number of at least 1';
  return null;
}

// ----- Public: list with search + filters -----
router.get('/', async (req, res, next) => {
  try {
    const { q, search, category, date, location, availability, includePast, sort, limit } = req.query;
    const f = { status: 'published' };
    if (!includePast) f.date = { $gte: today() };
    if (category) f.category = category;
    if (date) {
      const s = today(), e = new Date(s);
      if (date === 'today') e.setUTCDate(e.getUTCDate() + 1);
      else if (date === 'week') e.setUTCDate(e.getUTCDate() + 7);
      else if (date === 'month') e.setUTCMonth(e.getUTCMonth() + 1);
      f.date = { $gte: s, $lt: e };
    }
    const and = [];
    const term = search || q;
    if (term) { const r = rx(term); and.push({ $or: [{ title: r }, { organizerName: r }, { location: r }, { venue: r }] }); }
    if (location) { const r = rx(location); and.push({ $or: [{ location: r }, { venue: r }, { address: r }] }); }
    if (availability === 'available') and.push({ $expr: { $lt: ['$registered', '$capacity'] } });
    if (and.length) f.$and = and;
    let query = Event.find(f).sort(SORTS[sort] || SORTS.upcoming);
    if (limit) query = query.limit(Math.min(parseInt(limit, 10) || 12, 50));
    res.json(await query);
  } catch (e) { next(e); }
});

// Categories + locations that actually exist (drives filters and the home page)
router.get('/meta', async (req, res, next) => {
  try {
    const base = { status: 'published', date: { $gte: today() } };
    const cats = await Event.aggregate([{ $match: base }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const locations = await Event.distinct('location', base);
    res.json({ categories: cats.map((c) => ({ name: c._id, count: c.count })), locations: locations.sort() });
  } catch (e) { next(e); }
});

// ----- Organizer -----
router.get('/mine', auth, role('organizer'), async (req, res, next) => {
  try { res.json(await Event.find({ organizer: req.user._id }).sort({ date: -1 })); } catch (e) { next(e); }
});

router.get('/stats/organizer', auth, role('organizer'), async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ date: 1 });
    const live = events.filter((e) => e.status !== 'cancelled');
    const sold = live.reduce((a, e) => a + e.registered, 0);
    const cap = live.reduce((a, e) => a + e.capacity, 0);
    res.json({
      totalEvents: events.length,
      registrations: sold,
      ticketsSold: sold,
      activeEvents: live.filter((e) => e.date >= today() && e.status === 'published').length,
      upcoming: live.filter((e) => e.date >= today() && e.status === 'published').length,
      totalCapacity: cap,
      remaining: cap - sold,
      occupancy: cap ? Math.round((sold / cap) * 100) : 0,
      activity: await daily({ event: { $in: events.map((e) => e._id) } }, 7),
      events: events.map((e) => ({ phase: e.phase, _id: e._id, title: e.title, capacity: e.capacity, registered: e.registered, status: e.status, date: e.date }))
    });
  } catch (e) { next(e); }
});

router.post('/', auth, role('organizer'), upload.single('image'), async (req, res, next) => {
  try {
    const d = fromBody(req.body);
    const err = validate(d);
    if (err) return bad(res, err);
    const ev = await Event.create({
      ...d, organizer: req.user._id, organizerName: req.user.name,
      image: req.file ? '/uploads/' + req.file.filename : ''
    });
    res.status(201).json(ev);
  } catch (e) { next(e); }
});

async function owned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { bad(res, 'Event not found', 404); return null; }
  const ev = await Event.findById(req.params.id);
  if (!ev) { bad(res, 'Event not found', 404); return null; }
  if (String(ev.organizer) !== String(req.user._id)) { bad(res, 'You can only manage your own events', 403); return null; }
  return ev;
}

router.put('/:id', auth, role('organizer'), upload.single('image'), async (req, res, next) => {
  try {
    const ev = await owned(req, res); if (!ev) return;
    if (ev.status === 'cancelled') return bad(res, 'Cancelled events cannot be edited');
    const d = fromBody(req.body);
    const err = validate(d);
    if (err) return bad(res, err);
    if (d.capacity < ev.registered) return bad(res, `Capacity cannot be lower than the ${ev.registered} seats already booked`);
    Object.assign(ev, d);
    if (req.file) ev.image = '/uploads/' + req.file.filename;
    await ev.save();
    res.json(ev);
  } catch (e) { next(e); }
});

// Cancel event (soft delete) and notify attendees
router.delete('/:id', auth, role('organizer'), async (req, res, next) => {
  try {
    const ev = await owned(req, res); if (!ev) return;
    ev.status = 'cancelled'; await ev.save();
    const regs = await Registration.find({ event: ev._id, status: 'confirmed' });
    await Notification.insertMany(regs.map((r) => ({ user: r.user, type: 'error', message: `❌ "${ev.title}" has been cancelled.` })));
    res.json({ message: 'Event cancelled' });
  } catch (e) { next(e); }
});

router.get('/:id/attendees', auth, role('organizer'), async (req, res, next) => {
  try {
    const ev = await owned(req, res); if (!ev) return;
    const regs = await Registration.find({ event: ev._id, status: 'confirmed' }).populate('user', 'name email phone').sort('createdAt');
    res.json({ event: ev, attendees: regs });
  } catch (e) { next(e); }
});

router.patch('/:id/attendees/:regId/checkin', auth, role('organizer'), async (req, res, next) => {
  try {
    const ev = await owned(req, res); if (!ev) return;
    const reg = await Registration.findOne({ _id: req.params.regId, event: ev._id, status: 'confirmed' });
    if (!reg) return bad(res, 'Registration not found', 404);
    reg.checkedIn = !reg.checkedIn; await reg.save();
    res.json(reg);
  } catch (e) { next(e); }
});

router.get('/:id/analytics', auth, role('organizer'), async (req, res, next) => {
  try {
    const ev = await owned(req, res); if (!ev) return;
    const checkedIn = await Registration.countDocuments({ event: ev._id, status: 'confirmed', checkedIn: true });
    res.json({ event: ev, checkedIn, daily: await daily({ event: ev._id }, 14) });
  } catch (e) { next(e); }
});

// ----- Public: single event (drafts only visible to their organizer) -----
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'Event not found', 404);
    const ev = await Event.findById(req.params.id);
    if (!ev) return bad(res, 'Event not found', 404);
    if (ev.status === 'draft' && String(ev.organizer) !== String(req.user?._id)) return bad(res, 'Event not found', 404);
    res.json(ev);
  } catch (e) { next(e); }
});

module.exports = router;
