const mongoose = require('mongoose');

const periodTrackerSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    key: { type: String, default: 'global' },
    anchorDate: { type: String, default: '' }, // YYYY-MM-DD
    periodLength: { type: Number, default: 5, min: 2, max: 10 },
    cycleLength: { type: Number, default: 28, min: 20, max: 45 },
    loggedDates: [{ type: String }], // YYYY-MM-DD[]
    symptomLogs: {
      type: Map,
      of: new mongoose.Schema(
        {
          mood: { type: Number, min: 0, max: 5, default: 0 },
          cramps: { type: Number, min: 0, max: 5, default: 0 },
          backPain: { type: Number, min: 0, max: 5, default: 0 },
          acne: { type: Number, min: 0, max: 5, default: 0 },
          sleep: { type: Number, min: 0, max: 5, default: 0 },
          discharge: { type: Number, min: 0, max: 5, default: 0 },
          medication: { type: String, default: '' },
          updatedAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
      default: {},
    },
    reminders: {
      periodLeadDays: { type: [Number], default: [1, 2, 3] },
      pill: {
        enabled: { type: Boolean, default: false },
        time: { type: String, default: '21:00' }, // HH:mm
      },
      iron: {
        enabled: { type: Boolean, default: false },
        time: { type: String, default: '08:00' }, // HH:mm
      },
      padChange: {
        enabled: { type: Boolean, default: false },
        intervalHours: { type: Number, min: 1, max: 8, default: 4 },
      },
    },
  },
  { timestamps: true }
);

periodTrackerSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('PeriodTracker', periodTrackerSchema);
