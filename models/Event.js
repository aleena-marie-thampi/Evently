const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Title is required'], trim: true },
  description: { type: String, required: [true, 'Description is required'] },
  category: { type: String, required: [true, 'Category is required'] },
  image: { type: String, default: '' },
  date: { type: Date, required: [true, 'Date is required'] },
  startTime: { type: String, required: [true, 'Start time is required'] },
  endTime: { type: String, required: [true, 'End time is required'] },
  venue: { type: String, required: [true, 'Venue is required'] },
  address: { type: String, default: '' },
  location: { type: String, required: [true, 'Location (city) is required'], trim: true },
  capacity: { type: Number, required: true, min: [1, 'Capacity must be at least 1'] },
  registered: { type: Number, default: 0, min: 0 },
  deadline: { type: Date },
  status: { type: String, enum: ['published', 'draft', 'cancelled'], default: 'published' },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerName: { type: String, default: '' }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

eventSchema.virtual('available').get(function () { return Math.max(0, this.capacity - this.registered); });
eventSchema.virtual('phase').get(function () {
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'draft') return 'draft';
  const t = new Date(); t.setUTCHours(0, 0, 0, 0);
  return this.date < t ? 'completed' : 'published';
});
eventSchema.index({ date: 1, status: 1 });
module.exports = mongoose.model('Event', eventSchema);
