// Demo data:  npm run seed
// Result: 2 organizers, 10 attendees, 5 events. Registrations and notifications are left EMPTY.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Notification = require('./models/Notification');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdb');
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Registration.deleteMany({}), Notification.deleteMany({})]);

  const pw = await bcrypt.hash('demo123', 10);

  const [org1, org2] = await User.insertMany([
    { name: 'Tech Club', email: 'organizer1@demo.com', password: pw, role: 'organizer' },
    { name: 'Campus Events Team', email: 'organizer2@demo.com', password: pw, role: 'organizer' }
  ]);

  const attendeeNames = ['Aleena Marie Thampi', 'Arjun Nair', 'Meera Menon', 'Rahul Varma', 'Sneha George', 'Kiran Das', 'Anjali Pillai', 'Joseph Mathew', 'Fathima Beevi', 'Vishnu Prasad'];
  await User.insertMany(attendeeNames.map((name, i) => ({ name, email: `attendee${i + 1}@demo.com`, password: pw, role: 'attendee' })));

  const day = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; };
  const mk = (o, org) => ({ startTime: '10:00', endTime: '13:00', status: 'published', registered: 0, organizer: org._id, organizerName: org.name, ...o });

  await Event.insertMany([
    mk({ title: 'AI & Innovation Workshop', category: 'Technology', description: 'A workshop covering current developments in artificial intelligence, machine learning, and emerging technologies.', date: day(5), venue: 'Seminar Hall, MACE', location: 'Kochi', capacity: 100 }, org1),
    mk({ title: 'Web Dev Bootcamp', category: 'Workshops', description: 'Hands-on day building a full-stack app with Node.js and MongoDB.', date: day(8), venue: 'Lab 3', location: 'Kochi', capacity: 40 }, org1),
    mk({ title: 'Monsoon Music Night', category: 'Music', description: 'Live indie sets under the open sky.', date: day(12), startTime: '18:30', endTime: '22:00', venue: 'Marine Drive Grounds', location: 'Kochi', capacity: 300 }, org2),
    mk({ title: 'Startup Pitch Day', category: 'Business', description: 'Ten student startups pitch to local investors.', date: day(20), venue: 'Auditorium', location: 'Kottayam', capacity: 150 }, org2),
    mk({ title: 'Onam Cultural Fest', category: 'Cultural', description: 'Dance, music, pookalam and a sadya.', date: day(30), venue: 'Town Hall', location: 'Kochi', capacity: 250 }, org2)
  ]);

  console.log('Seeded: 2 organizers, 10 attendees, 5 events. Registrations: 0, Notifications: 0.');
  console.log('Organizers: organizer1@demo.com, organizer2@demo.com | Attendees: attendee1@demo.com ... attendee10@demo.com | Password: demo123');
  process.exit(0);
})();
