const express = require('express');

const router = express.Router();

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
      content: m.content.trim(),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-12);
}

function normalizeContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
  const entries = Object.entries(context).slice(0, 30).map(([k, v]) => {
    if (typeof v === 'string') return [k, v.slice(0, 1000)];
    if (typeof v === 'number' || typeof v === 'boolean' || v == null) return [k, v];
    if (Array.isArray(v)) return [k, v.slice(0, 30)];
    return [k, String(v).slice(0, 1000)];
  });
  return Object.fromEntries(entries);
}

function contextText(context) {
  const c = normalizeContext(context);
  if (!Object.keys(c).length) return '';
  return `\nDu lieu trang hien tai (JSON): ${JSON.stringify(c)}`;
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
