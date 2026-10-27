const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function load(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return await User.findById(id).select('-password');
  } catch { return null; }
}
const auth = async (req, res, next) => {
  const user = await load(req);
  if (!user) return res.status(401).json({ message: 'Please log in to continue' });
  req.user = user; next();
};
const optionalAuth = async (req, res, next) => { req.user = await load(req); next(); };
const role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: `This action needs a ${roles.join(' / ')} account` });

module.exports = { auth, optionalAuth, role };
