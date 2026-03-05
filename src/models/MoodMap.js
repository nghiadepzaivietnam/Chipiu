const mongoose = require("mongoose");

const moodEntrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, trim: true }, // YYYY-MM-DD
    mineMood: { type: String, default: "okay" },
    partnerMood: { type: String, default: "okay" },
    mineReason: { type: String, default: "", maxlength: 160 },
    partnerReason: { type: String, default: "", maxlength: 160 },
    note: { type: String, default: "", maxlength: 500 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const moodMapSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "default", index: true },
    key: { type: String, default: "main", index: true },
    entries: { type: [moodEntrySchema], default: [] },
  },
  { timestamps: true }
);

moodMapSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("MoodMap", moodMapSchema);

