const mongoose = require('mongoose');

const journeyItemSchema = new mongoose.Schema(
  {
    date: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['haianh', 'toi', 'both'], default: 'haianh' },
    title: { type: String, trim: true, required: true, maxlength: 180 },
    desc: { type: String, trim: true, default: '', maxlength: 700 },
    future: { type: Boolean, default: false },
  },
  { _id: false }
);

const journeySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, index: true },
    avatars: {
      haianh: { type: String, default: '/hai-anh.jpg' },
      toi: { type: String, default: '/uploads/1772244572266-5389.jpg' },
    },
    items: { type: [journeyItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Journey', journeySchema);
