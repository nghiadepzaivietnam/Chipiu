const mongoose = require("mongoose");

const waterEntrySchema = new mongoose.Schema(
  {
    date: { type: String, default: "" },
    counts: {
      haiAnh: { type: Number, default: 0 },
      trongNghia: { type: Number, default: 0 },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const waterReminderSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "default", index: true },
    key: { type: String, default: "global" },
    goal: { type: Number, default: 8 },
    times: { type: [String], default: ["08:30", "10:30", "12:30", "15:00", "17:00", "20:30"] },
    entries: { type: [waterEntrySchema], default: [] },
  },
  { timestamps: true }
);

waterReminderSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("WaterReminder", waterReminderSchema);
