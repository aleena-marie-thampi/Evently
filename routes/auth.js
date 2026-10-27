const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const user = await User.create({
      name, email, password: await bcrypt.hash(password, 10),
      role: role === 'organizer' ? 'organizer' : 'attendee'
    });
    res.status(201).json({ token: sign(user), user: pub(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password)))
      return res.status(401).json({ message: 'Incorrect email or password' });
    if (user.active === false) return res.status(403).json({ message: 'This account has been deactivated' });
    res.json({ token: sign(user), user: pub(user) });
  } catch (e) { next(e); }
});

router.get('/me', auth, (req, res) => res.json(pub(req.user)));

router.put('/me', auth, async (req, res, next) => {
  try {
    if (req.body.name) req.user.name = req.body.name;
    if (req.body.phone !== undefined) req.user.phone = req.body.phone;
    await req.user.save();
    res.json(pub(req.user));
  } catch (e) { next(e); }
});

router.put('/password', auth, async (req, res, next) => {
  try {
    const { current, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(current || '', user.password))) return res.status(400).json({ message: 'Current password is incorrect' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    user.password = await bcrypt.hash(password, 10); await user.save();
    res.json({ message: 'Password updated' });
  } catch (e) { next(e); }
});

module.exports = router;
