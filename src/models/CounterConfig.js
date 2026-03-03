const mongoose = require('mongoose');

const counterConfigSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    key: { type: String, default: 'global' },
    loveStartISO: { type: String, default: '' },
  },
  { timestamps: true }
);

counterConfigSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('CounterConfig', counterConfigSchema);
