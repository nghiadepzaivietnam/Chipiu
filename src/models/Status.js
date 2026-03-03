const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    city: { type: String, required: true },
    temperatureC: { type: Number },
    condition: { type: String }, // e.g., Sunny, Rainy
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Status', statusSchema);
