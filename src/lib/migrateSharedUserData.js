const AiChatHistory = require("../models/AiChatHistory");
const CounterConfig = require("../models/CounterConfig");
const CounterBackground = require("../models/CounterBackground");
const Journey = require("../models/Journey");
const Moment = require("../models/Moment");
const PeriodTracker = require("../models/PeriodTracker");
const Status = require("../models/Status");

const SHARED_USER_ID = process.env.SHARED_USER_ID || "hdha-shared";

async function promoteLatestByKey(Model, keyField, keyValue, payloadFields) {
  const latest = await Model.findOne({ [keyField]: keyValue }).sort({ updatedAt: -1, createdAt: -1 });
  if (!latest) return;

  const payload = { userId: SHARED_USER_ID, [keyField]: keyValue };
  payloadFields.forEach((f) => {
    payload[f] = latest[f];
  });

  await Model.findOneAndUpdate(
    { userId: SHARED_USER_ID, [keyField]: keyValue },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Model.deleteMany({ [keyField]: keyValue, userId: { $ne: SHARED_USER_ID } });
}

async function migrateToSharedUser() {
  await promoteLatestByKey(AiChatHistory, "key", "global", ["messages", "conversations", "activeConversationId", "widgetPosition"]);
  await promoteLatestByKey(CounterConfig, "key", "global", ["loveStartISO"]);
  await promoteLatestByKey(PeriodTracker, "key", "global", [
    "anchorDate",
    "periodLength",
    "cycleLength",
    "loggedDates",
    "symptomLogs",
    "reminders",
  ]);
  await promoteLatestByKey(Journey, "key", "main", ["avatars", "items", "builderDraft"]);

  await Moment.updateMany({ userId: { $ne: SHARED_USER_ID } }, { $set: { userId: SHARED_USER_ID } });
  await Status.updateMany({ userId: { $ne: SHARED_USER_ID } }, { $set: { userId: SHARED_USER_ID } });
  await CounterBackground.updateMany({ userId: { $ne: SHARED_USER_ID } }, { $set: { userId: SHARED_USER_ID } });
}

module.exports = {
  migrateToSharedUser,
  SHARED_USER_ID,
};
