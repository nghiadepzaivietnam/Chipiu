const mongoose = require('mongoose');

const counterBackgroundSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CounterBackground', counterBackgroundSchema);
