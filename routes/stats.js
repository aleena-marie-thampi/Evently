const router = require('express').Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');

// Live numbers for the home page
router.get('/', async (req, res, next) => {
  try {
    const [events, registrations, organizers, attendees] = await Promise.all([
      Event.countDocuments({ status: 'published' }),
      Registration.countDocuments({ status: 'confirmed' }),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'attendee' })
    ]);
    res.json({ events, registrations, organizers, attendees });
  } catch (e) { next(e); }
});
module.exports = router;
