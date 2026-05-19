const Business = require('../models/Business');
const Service = require('../models/Service');
const Availability = require('../models/Availability');

// Free models tried in order — if one rate-limits or fails, the next is tried
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'qwen/qwen3-8b:free',
  'mistralai/mistral-7b-instruct:free',
];

async function callOpenRouter(key, systemPrompt, messages) {
  let lastError = new Error('All AI models unavailable');
  for (const model of FREE_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.FRONTEND_URL || 'https://bookam.business',
          'X-Title': 'BookAm AI Booking',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 500,
          temperature: 0.55,
        }),
      });

      if (response.status === 429 || response.status === 503 || response.status === 502) {
        lastError = new Error(`${model} rate limited or unavailable`);
        console.warn(`[AI] ${model} returned ${response.status}, trying next model`);
        continue;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`${model} failed: ${response.status} ${text.slice(0, 100)}`);
        console.warn(`[AI] ${model} error:`, lastError.message);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`${model} returned empty content`);
        continue;
      }

      console.log(`[AI] Success with model: ${model}`);
      return content;
    } catch (err) {
      lastError = err;
      console.warn(`[AI] ${model} threw:`, err.message);
    }
  }
  throw lastError;
}

exports.chat = async (req, res) => {
  try {
    const { slug, messages } = req.body;
    if (!slug || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'slug and messages are required' });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return res.status(503).json({ error: 'AI service not configured' });

    const business = await Business.findBySlug(slug);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const [services, availability] = await Promise.all([
      Service.findByBusinessId(business.id),
      Availability.findByBusinessId(business.id).catch(() => null),
    ]);

    const active = (services || []).filter(s => s.is_active);
    const workingDays = availability?.working_days?.join(', ') || 'Monday–Friday';
    const openTime  = availability?.opening_time?.slice(0, 5)  || '09:00';
    const closeTime = availability?.closing_time?.slice(0, 5)  || '18:00';
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const serviceList = active.map(s =>
      `• ${s.name} — £${parseFloat(s.price || 0).toFixed(2)}, ${s.duration_minutes} min` +
      (s.description ? ` — ${s.description}` : '')
    ).join('\n');

    const serviceIds = active.map(s => `${s.name}: ${s.id}`).join('\n');

    const systemPrompt = `You are a smart booking assistant for ${business.name}. Help customers book an appointment in as few messages as possible.

Business: ${business.name}${business.location ? ` · ${business.location}` : ''}
Today is: ${today}
Working hours: ${openTime}–${closeTime}, open on: ${workingDays}

Services offered:
${serviceList || 'Services listed on our booking page.'}

Rules:
1. Be warm, brief, and efficient. Max 2–3 sentences per reply. British English.
2. Ask one question at a time. Discover: service → date/time → name → phone.
3. Phone is required. Email is optional.
4. If they say "morning" suggest 9–12, "afternoon" suggest 12–17, "evening" suggest 17–closing.
5. Never hallucinate services not listed above.
6. Once you have service, date, start time, name, and phone — confirm the details with the customer before appending the booking token.
7. After the customer confirms, append BOOKING_READY exactly as shown below.

Service UUIDs (use these exactly):
${serviceIds}

When all info is confirmed, append this on its own line at the very end of your reply — valid JSON, no markdown:
BOOKING_READY:{"service_id":"REPLACE_WITH_UUID","service_name":"REPLACE","booking_date":"YYYY-MM-DD","start_time":"HH:MM","customer_name":"Full Name","customer_phone":"+44...","customer_email":"","notes":""}`;

    const raw = await callOpenRouter(key, systemPrompt, messages);

    // Extract BOOKING_READY token
    let booking_data = null;
    const match = raw.match(/BOOKING_READY:(\{[\s\S]+?\})/);
    if (match) {
      try { booking_data = JSON.parse(match[1]); } catch {}
    }

    const reply = raw.replace(/BOOKING_READY:[\s\S]+$/, '').trim();
    res.json({ reply, booking_data });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'The AI assistant is temporarily unavailable. Please use the standard booking form.' });
  }
};
