const mongoose = require("mongoose");

const momentSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "default", index: true },
    owner: { type: String, required: true, trim: true, maxlength: 80 },
    caption: { type: String, trim: true },
    mediaType: { type: String, enum: ["image", "video", "none"], default: "none" },
    mediaUrl: { type: String },
    allowCombined: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Moment", momentSchema);
