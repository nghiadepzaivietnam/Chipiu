const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: 'Cuoc tro chuyen moi', maxlength: 120 },
    messages: { type: [messageSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiChatHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'default', index: true },
    key: { type: String, default: 'global' },
    messages: { type: [messageSchema], default: [] },
    conversations: { type: [conversationSchema], default: [] },
    activeConversationId: { type: String, default: '' },
    widgetPosition: {
      x: { type: Number, default: null },
      y: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

aiChatHistorySchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('AiChatHistory', aiChatHistorySchema);
