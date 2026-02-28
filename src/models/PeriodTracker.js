const mongoose = require('mongoose');

const periodTrackerSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    anchorDate: { type: String, default: '' }, // YYYY-MM-DD
    periodLength: { type: Number, default: 5, min: 2, max: 10 },
    cycleLength: { type: Number, default: 28, min: 20, max: 45 },
    loggedDates: [{ type: String }], // YYYY-MM-DD[]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PeriodTracker', periodTrackerSchema);
