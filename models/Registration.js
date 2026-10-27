const mongoose = require('mongoose');
const regSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  checkedIn: { type: Boolean, default: false }
}, { timestamps: true });
regSchema.index({ user: 1, event: 1 }, { unique: true }); // one registration per user per event
module.exports = mongoose.model('Registration', regSchema);
