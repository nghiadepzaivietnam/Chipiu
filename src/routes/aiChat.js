const express = require('express');
const fs = require('fs');
const path = require('path');
const AiChatHistory = require('../models/AiChatHistory');
const Moment = require('../models/Moment');
const Status = require('../models/Status');
const CounterConfig = require('../models/CounterConfig');
const CounterBackground = require('../models/CounterBackground');
const PeriodTracker = require('../models/PeriodTracker');
const Journey = require('../models/Journey');

const router = express.Router();
const HISTORY_KEY = 'global';
const MAX_HISTORY_MESSAGES = 20;
const MAX_CONVERSATIONS = 30;
const OWNER_PROFILE_PATH = path.join(__dirname, '../../public/owner-profile.json');

const SYSTEM_PROMPT = [
  'Ban la tro ly AI than thien tren website ca nhan.',
  'Tra loi bang tieng Viet ngan gon, ro rang, de hieu.',
  'Ban co the tu van doi song, hoc tap, kien thuc thong dung, va chu ky kinh nguyet o muc tham khao.',
  'Khong chan doan y khoa.',
  'Neu co dau hieu nguy hiem suc khoe, nhac nguoi dung di kham bac si.',
].join(' ');

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (!Array.isArray(payload?.output)) return '';
  const chunks = [];
  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      if (typeof part?.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function extractChatCompletionText(payload) {
  const text = payload?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

function fallbackReply(message) {
  return [
    `Minh da nhan cau hoi: "${message.trim()}".`,
    'Hien AI nang cao chua co API token hop le (HF/OpenAI) nen dang o che do co ban.',
    'Ban van co the hoi ve doi song, hoc tap, ke hoach ca nhan, va theo doi chu ky.',
    'Neu la van de suc khoe nghiem trong hoac keo dai, nen di kham bac si.',
    'Muon bat AI day du: them HF_API_TOKEN (hoac OPENAI_API_KEY) vao .env va khoi dong lai server.',
  ].join('\n');
}

function fallbackReplyByReason(message, reason) {
  if (reason === 'quota') {
    return [
      `Minh da nhan cau hoi: "${message.trim()}".`,
      'AI nang cao dang tam dung vi tai khoan API het quota/chua bat billing.',
      'Ban van co the chat voi che do co ban.',
      'Khi nap quota hoac bat billing xong, AI se tu hoat dong lai.',
    ].join('\n');
  }
  return fallbackReply(message);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim().slice(0, 2000),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

function sanitizeTitle(value) {
  if (typeof value !== 'string') return 'Cuoc tro chuyen moi';
  const t = value.trim().slice(0, 120);
  return t || 'Cuoc tro chuyen moi';
}

function normalizeConversations(conversations) {
  if (!Array.isArray(conversations)) return [];
  const out = [];
  const used = new Set();
  conversations.forEach((conv) => {
    const idRaw = typeof conv?.id === 'string' ? conv.id.trim().slice(0, 64) : '';
    const id = idRaw || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (used.has(id)) return;
    used.add(id);
    out.push({
      id,
      title: sanitizeTitle(conv?.title),
      messages: normalizeMessages(conv?.messages),
      createdAt: conv?.createdAt ? new Date(conv.createdAt) : new Date(),
      updatedAt: conv?.updatedAt ? new Date(conv.updatedAt) : new Date(),
    });
  });
  out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return out.slice(0, MAX_CONVERSATIONS);
}

function sanitizeValue(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 2000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 3) return JSON.stringify(value).slice(0, 2000);

  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .slice(0, 80)
      .map(([k, v]) => [k, sanitizeValue(v, depth + 1)]);
    return Object.fromEntries(entries);
  }

  return String(value).slice(0, 2000);
}

function normalizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
  const entries = Object.entries(context)
    .slice(0, 80)
    .map(([k, v]) => [k, sanitizeValue(v, 0)]);
  return Object.fromEntries(entries);
}

function contextText(context) {
  const c = normalizeContext(context);
  if (!Object.keys(c).length) return '';
  return `\nDu lieu trang hien tai (JSON): ${JSON.stringify(c)}`;
}

function loadOwnerProfile() {
  try {
    const raw = fs.readFileSync(OWNER_PROFILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeValue(parsed, 0);
  } catch (_err) {
    return null;
  }
}

async function callHuggingFaceChat({ history, page, context }) {
  const token = process.env.HF_API_TOKEN;
  if (!token) return null;

  const model = process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT} Trang hien tai: ${page}.${contextText(context)}` },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.error || 'Khong the goi Hugging Face luc nay.';
    const isQuota = response.status === 429 || /quota|billing|payment|credit/i.test(String(msg));
    const err = new Error(String(msg));
    err.isQuota = isQuota;
    err.status = response.status;
    throw err;
  }

  const reply = extractChatCompletionText(data);
  if (!reply) throw new Error('Hugging Face khong tra ve noi dung hop le.');
  return reply;
}

async function callOpenAiResponses({ input }) {
  const token = process.env.OPENAI_API_KEY;
  if (!token) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 500,
      input,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || 'Khong the goi OpenAI luc nay.';
    const code = data?.error?.code || '';
    const isQuota =
      code === 'insufficient_quota' ||
      response.status === 429 ||
      /quota|billing|payment/i.test(String(msg));
    const err = new Error(String(msg));
    err.isQuota = isQuota;
    err.status = response.status;
    throw err;
  }

  const reply = extractOutputText(data);
  if (!reply) throw new Error('OpenAI khong tra ve noi dung hop le.');
  return reply;
}

router.get('/history', async (_req, res) => {
  try {
    const userId = _req.userId || 'default';
    const doc = await AiChatHistory.findOne({ userId, key: HISTORY_KEY });
    let conversations = normalizeConversations(doc?.conversations || []);
    if (!conversations.length) {
      const legacyMessages = normalizeMessages(doc?.messages || []);
      if (legacyMessages.length) {
        conversations = [
          {
            id: 'legacy',
            title: 'Cuoc tro chuyen cu',
            messages: legacyMessages,
            createdAt: doc?.createdAt || new Date(),
            updatedAt: doc?.updatedAt || new Date(),
          },
        ];
      }
    }
    const knownIds = new Set(conversations.map((c) => c.id));
    const activeConversationId = knownIds.has(doc?.activeConversationId) ? doc.activeConversationId : (conversations[0]?.id || '');
    return res.json({
      conversations,
      activeConversationId,
      widgetPosition: doc?.widgetPosition || { x: null, y: null },
      updatedAt: doc?.updatedAt || null,
    });
  } catch (_err) {
    return res.status(500).json({ error: 'Khong the tai lich su chat.' });
  }
});

router.put('/history', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    let conversations = normalizeConversations(req.body?.conversations);
    if (!conversations.length) {
      const legacyMessages = normalizeMessages(req.body?.messages);
      if (legacyMessages.length) {
        conversations = [
          {
            id: 'legacy',
            title: 'Cuoc tro chuyen cu',
            messages: legacyMessages,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
    }
    const requestedActive = typeof req.body?.activeConversationId === 'string' ? req.body.activeConversationId.trim() : '';
    const knownIds = new Set(conversations.map((c) => c.id));
    const activeConversationId = knownIds.has(requestedActive) ? requestedActive : (conversations[0]?.id || '');
    const activeMessages = conversations.find((c) => c.id === activeConversationId)?.messages || [];
    const doc = await AiChatHistory.findOneAndUpdate(
      { userId, key: HISTORY_KEY },
      {
        userId,
        key: HISTORY_KEY,
        conversations,
        activeConversationId,
        messages: activeMessages,
        widgetPosition: {
          x: Number.isFinite(req.body?.widgetPosition?.x) ? Math.round(req.body.widgetPosition.x) : null,
          y: Number.isFinite(req.body?.widgetPosition?.y) ? Math.round(req.body.widgetPosition.y) : null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const responseConversations = normalizeConversations(doc?.conversations || []);
    const responseActive = responseConversations.some((c) => c.id === doc?.activeConversationId)
      ? doc.activeConversationId
      : (responseConversations[0]?.id || '');
    return res.json({
      conversations: responseConversations,
      activeConversationId: responseActive,
      widgetPosition: doc?.widgetPosition || { x: null, y: null },
      updatedAt: doc?.updatedAt || null,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Khong the luu lich su chat.' });
  }
});

router.get('/app-data', async (req, res) => {
  try {
    const userId = req.userId || 'default';
    const [
      moments,
      status,
      counterConfig,
      counterBackground,
      periodTracker,
      journey,
    ] = await Promise.all([
      Moment.find({ userId }).sort({ createdAt: -1 }).lean(),
      Status.findOne({ userId }).sort({ updatedAt: -1 }).lean(),
      CounterConfig.findOne({ userId, key: 'global' }).lean(),
      CounterBackground.findOne({ userId }).sort({ updatedAt: -1 }).lean(),
      PeriodTracker.findOne({ userId, key: 'global' }).lean(),
      Journey.findOne({ userId, key: 'main' }).lean(),
    ]);

    const safeMoments = (moments || []).map((m) => ({
      owner: m.owner || '',
      caption: (m.caption || '').slice(0, 500),
      mediaType: m.mediaType || 'none',
      mediaUrl: m.mediaUrl || '',
      allowCombined: Boolean(m.allowCombined),
      createdAt: m.createdAt || null,
    }));

    const safePeriod = periodTracker
      ? {
          anchorDate: periodTracker.anchorDate || '',
          periodLength: Number(periodTracker.periodLength) || 0,
          cycleLength: Number(periodTracker.cycleLength) || 0,
          loggedDates: Array.isArray(periodTracker.loggedDates) ? periodTracker.loggedDates : [],
          symptomLogs: periodTracker.symptomLogs || {},
          reminders: periodTracker.reminders || {},
          updatedAt: periodTracker.updatedAt || null,
        }
      : null;

    const safeJourney = journey
      ? {
          avatars: journey.avatars || {},
          items: Array.isArray(journey.items) ? journey.items : [],
          builderDraft: journey.builderDraft || null,
          updatedAt: journey.updatedAt || null,
        }
      : null;

    return res.json({
      generatedAt: new Date().toISOString(),
      userId,
      ownerProfile: loadOwnerProfile(),
      status: status || null,
      counter: {
        config: counterConfig || null,
        background: counterBackground || null,
      },
      period: safePeriod,
      journey: safeJourney,
      moments: safeMoments,
      counts: {
        moments: safeMoments.length,
        journeyItems: safeJourney?.items?.length || 0,
        periodLoggedDates: safePeriod?.loggedDates?.length || 0,
      },
    });
  } catch (_err) {
    return res.status(500).json({ error: 'Khong the tai du lieu tong hop cho AI.' });
  }
});

router.post('/', async (req, res) => {
  const history = normalizeMessages(req.body?.messages);
  const latestUser = [...history].reverse().find((m) => m.role === 'user');
  const page = typeof req.body?.page === 'string' ? req.body.page : 'unknown';
  const context = normalizeContext(req.body?.context);

  if (!latestUser) {
    return res.status(400).json({ error: 'Thieu noi dung hoi.' });
  }

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: `${SYSTEM_PROMPT} Trang hien tai: ${page}.${contextText(context)}` }],
    },
    ...history.map((m) => ({
      role: m.role,
      content: [
        {
          type: m.role === 'assistant' ? 'output_text' : 'input_text',
          text: m.content,
        },
      ],
    })),
  ];

  let providerError = '';

  try {
    if (process.env.HF_API_TOKEN) {
      const hfReply = await callHuggingFaceChat({ history, page, context });
      return res.json({ reply: hfReply, mode: 'huggingface' });
    }
  } catch (err) {
    if (err.isQuota) {
      return res.json({
        reply: fallbackReplyByReason(latestUser.content, 'quota'),
        mode: 'fallback',
      });
    }
    providerError = `Hugging Face: ${err.message || 'unknown error'}`;
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      const oaReply = await callOpenAiResponses({ input });
      return res.json({ reply: oaReply, mode: 'openai' });
    }
  } catch (err) {
    if (err.isQuota) {
      return res.json({
        reply: fallbackReplyByReason(latestUser.content, 'quota'),
        mode: 'fallback',
      });
    }
    providerError = `OpenAI: ${err.message || 'unknown error'}`;
  }

  if (providerError) {
    return res.json({
      reply: `${fallbackReply(latestUser.content)}\n\nChi tiet loi nha cung cap: ${providerError}`,
      mode: 'fallback',
    });
  }

  return res.json({
    reply: fallbackReply(latestUser.content),
    mode: 'fallback',
  });
});

module.exports = router;
