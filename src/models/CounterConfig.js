const mongoose = require('mongoose');

const counterConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    loveStartISO: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CounterConfig', counterConfigSchema);
