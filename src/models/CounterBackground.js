const mongoose = require('mongoose');

const counterBackgroundSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CounterBackground', counterBackgroundSchema);
