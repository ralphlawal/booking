const Anthropic = require('@anthropic-ai/sdk');

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const MODEL = 'claude-sonnet-5-20251101';

/**
 * Summarize a set of reviews into 2–3 sentences.
 * Returns null if not enough reviews or no API key.
 */
async function summarizeReviews(reviews) {
  const client = getClient();
  if (!client || reviews.length < 3) return null;

  const reviewText = reviews
    .map(r => `Rating: ${r.rating}/5${r.comment ? ` — "${r.comment}"` : ''}`)
    .join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Summarize these customer reviews in 2–3 sentences. Focus on overall sentiment, what customers love, and any recurring concerns. Be specific and honest — don't just say "customers love it". Keep it factual and under 60 words.\n\nReviews:\n${reviewText}`,
    }],
  });

  return msg.content[0]?.text?.trim() || null;
}

/**
 * Score no-show risk for a booking.
 * Returns { level: 'low'|'medium'|'high', reason: string }
 */
function scoreNoShowRisk({ no_show_count, total_bookings, days_until_appointment, booking_created_hours_before }) {
  const total = Math.max(total_bookings || 1, 1);
  const rate = (no_show_count || 0) / total;

  let score = 0;

  // No-show history is the strongest signal
  if (no_show_count >= 3) score += 3;
  else if (no_show_count === 2) score += 2;
  else if (no_show_count === 1) score += 1;

  // Rate matters more than absolute count at scale
  if (rate > 0.3) score += 2;
  else if (rate > 0.15) score += 1;

  // Last-minute bookings have higher no-show rates
  if (booking_created_hours_before != null) {
    if (booking_created_hours_before < 2) score += 2;
    else if (booking_created_hours_before < 12) score += 1;
  }

  // Far-out bookings are less reliable
  if (days_until_appointment != null) {
    if (days_until_appointment > 14) score += 1;
  }

  let level, reason;
  if (score >= 5) {
    level = 'high';
    if (no_show_count >= 3) reason = `${no_show_count} no-shows recorded on this account`;
    else if (rate > 0.3) reason = `${Math.round(rate * 100)}% no-show rate across ${total} bookings`;
    else reason = 'Multiple risk factors: frequent no-shows + last-minute booking';
  } else if (score >= 2) {
    level = 'medium';
    if (no_show_count > 0) reason = `${no_show_count} previous no-show${no_show_count > 1 ? 's' : ''}`;
    else if (booking_created_hours_before < 12) reason = 'Booked less than 12 hours before appointment';
    else reason = 'Booked far in advance — some drop-off risk';
  } else {
    level = 'low';
    reason = no_show_count === 0 && total > 1
      ? `Clean record — ${total} booking${total > 1 ? 's' : ''}, 0 no-shows`
      : 'No concerning signals';
  }

  return { level, reason, score };
}

/**
 * AI rebooking timing: given a list of past bookings for a consumer at a business,
 * return a suggested follow-up window in plain English.
 */
async function suggestRebookTiming({ businessName, serviceName, pastBookings }) {
  const client = getClient();
  if (!client || !pastBookings.length) return null;

  const history = pastBookings
    .slice(0, 10)
    .map(b => `${b.booking_date} — ${b.service_name || serviceName}`)
    .join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `A customer has these past bookings at ${businessName}:\n${history}\n\nBased on their booking frequency, when should ${businessName} send a "time to rebook?" nudge? Reply in one short sentence like: "Send a reminder in ~X weeks — they typically book every Y weeks."`,
    }],
  });

  return msg.content[0]?.text?.trim() || null;
}

/**
 * AI service matching: interpret a natural-language query and return
 * structured search terms { q, category }.
 */
async function matchServiceQuery(rawQuery) {
  const client = getClient();
  if (!client) return { q: rawQuery, category: null };

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 80,
    messages: [{
      role: 'user',
      content: `Convert this service search into a JSON object with keys "q" (clean keyword for a business search) and "category" (one of: hair, barbers, nails, beauty, fitness, cleaning, massage, tutoring, photography, tattoo, therapy — or null). Query: "${rawQuery}"\n\nReply with only valid JSON, nothing else.`,
    }],
  });

  try {
    const text = msg.content[0]?.text?.trim() || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { q: parsed.q || rawQuery, category: parsed.category || null };
  } catch {
    return { q: rawQuery, category: null };
  }
}

module.exports = { summarizeReviews, scoreNoShowRisk, suggestRebookTiming, matchServiceQuery };
