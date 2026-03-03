const mongoose = require('mongoose');

const counterBackgroundSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },
  },
  { timestamps: true }
);

counterBackgroundSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('CounterBackground', counterBackgroundSchema);
