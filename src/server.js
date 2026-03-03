const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const AiChatHistory = require("./models/AiChatHistory");
const CounterConfig = require("./models/CounterConfig");
const Journey = require("./models/Journey");
const PeriodTracker = require("./models/PeriodTracker");
const { userContext } = require("./middleware/userContext");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hdha";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await Promise.all([
      User.syncIndexes(),
      AiChatHistory.syncIndexes(),
      CounterConfig.syncIndexes(),
      Journey.syncIndexes(),
      PeriodTracker.syncIndexes(),
    ]).catch((err) => {
      console.error("Index sync warning:", err.message || err);
    });
  })
  .catch((err) => console.error("Mongo error:", err));

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use("/api", userContext);
app.use("/api", (req, _res, next) => {
  User.updateOne(
    { userId: req.userId || "default" },
    { $set: { lastSeenAt: new Date() }, $setOnInsert: { userId: req.userId || "default" } },
    { upsert: true }
  ).catch(() => {});
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/moments", require("./routes/moments"));
app.use("/api/status", require("./routes/status"));
app.use("/api/counter-bg", require("./routes/counterBackground"));
app.use("/api/counter-config", require("./routes/counterConfig"));
app.use("/api/period", require("./routes/period"));
app.use("/api/period-ai", require("./routes/periodAi"));
app.use("/api/ai-chat", require("./routes/aiChat"));
app.use("/api/journey", require("./routes/journey"));

app.get(/^\/(?!api|uploads).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
