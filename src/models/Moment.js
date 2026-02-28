const mongoose = require('mongoose');

const momentSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, enum: ['Hải Anh', 'Trọng Nghĩa'] },
    caption: { type: String, trim: true },
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    mediaUrl: { type: String },
    allowCombined: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Moment', momentSchema);
