const express = require('express');

const router = express.Router();

const SYSTEM_PROMPT = [
  'Ban la tro ly ho tro theo doi chu ky kinh nguyet bang tieng Viet.',
  'Chi dua ra huong dan tham khao, khong chan doan benh.',
  'Neu co dau hieu nguy hiem (dau du doi, ra mau qua nhieu, choang, ngat), nhac di kham phu khoa som.',
  'Tra loi gon, de hieu, co cac buoc hanh dong cu the.',
].join(' ');

function buildFallbackReply(message, context) {
  const cycle = Number(context?.cycleLength) || 28;
  const period = Number(context?.periodLength) || 5;
  const nextStart = context?.nextPredictedStart || 'chua xac dinh';
  const logged = Array.isArray(context?.recentLoggedDates) ? context.recentLoggedDates.length : 0;

  return [
    `Minh da nhan cau hoi: "${message.trim()}".`,
    `Du lieu hien tai: chu ky ~${cycle} ngay, hanh kinh ~${period} ngay, ky du doan tiep theo: ${nextStart}.`,
    logged
      ? `Ban da co ${logged} moc gan day, hay tiep tuc tich deu moi thang de du doan chinh hon.`
      : 'Ban nen tich them ngay thuc te tren lich de ket qua du doan on dinh hon.',
    'Neu tre kinh > 7-10 ngay, dau bung du doi, ra mau rat nhieu, choang hoac met la keo dai: nen di kham phu khoa som.',
    'Muon bat AI that: them HF_API_TOKEN (hoac OPENAI_API_KEY) vao .env va khoi dong lai server.',
    'Luu y: day la goi y tham khao, khong thay the chan doan y khoa.',
  ].join('\n');
}

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

async function callHf({ userText }) {
  const token = process.env.HF_API_TOKEN;
  if (!token) return null;

  const model = process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || data?.error || 'Khong the goi Hugging Face luc nay.';
    const err = new Error(String(msg));
    err.isQuota = response.status === 429 || /quota|billing|payment|credit/i.test(String(msg));
    throw err;
  }
  const reply = extractChatCompletionText(data);
  if (!reply) throw new Error('Hugging Face khong tra ve noi dung hop le.');
  return reply;
}

async function callOpenAi({ userText }) {
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
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userText }],
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.error?.message || 'Khong the goi OpenAI luc nay.';
    const code = data?.error?.code || '';
    const err = new Error(String(msg));
    err.isQuota =
      code === 'insufficient_quota' ||
      response.status === 429 ||
      /quota|billing|payment/i.test(String(msg));
    throw err;
  }
  const reply = extractOutputText(data);
  if (!reply) throw new Error('OpenAI khong tra ve noi dung hop le.');
  return reply;
}

router.post('/', async (req, res) => {
  const { message, context } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Thieu cau hoi.' });
  }

  const userText = [
    `Cau hoi: ${message.trim()}`,
    `Du lieu chu ky (JSON): ${JSON.stringify(context || {})}`,
  ].join('\n');

  try {
    if (process.env.HF_API_TOKEN) {
      const reply = await callHf({ userText });
      return res.json({ reply, mode: 'huggingface' });
    }
  } catch (err) {
    if (err.isQuota) {
      return res.json({ reply: buildFallbackReply(message, context), mode: 'fallback' });
    }
  }

  try {
    if (process.env.OPENAI_API_KEY) {
      const reply = await callOpenAi({ userText });
      return res.json({ reply, mode: 'openai' });
    }
  } catch (err) {
    if (err.isQuota) {
      return res.json({ reply: buildFallbackReply(message, context), mode: 'fallback' });
    }
  }

  return res.json({ reply: buildFallbackReply(message, context), mode: 'fallback' });
});

module.exports = router;
