const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['success', 'ticket', 'warning', 'error'], default: 'success' },
  read: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Notification', schema);
