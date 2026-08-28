const Anthropic = require('@anthropic-ai/sdk');

const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const MODEL = 'claude-sonnet-5';

function plainText(value, maxLength = 360) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`#]/g, '')
    .replace(/^\s*(?:[-•]|\d+[.)])\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .replace(/\s+\S*$/, '')
    .trim();
}

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

/**
 * Generate a business description from name, category, and service list.
 */
async function generateBusinessDescription({ businessName, category, services }) {
  const client = getClient();
  if (!client) return null;

  const serviceList = services.slice(0, 8).map(s => s.name).join(', ');
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Write a compelling 2–3 sentence description for a ${category || 'service'} business called "${businessName}"${serviceList ? ` that offers: ${serviceList}` : ''}. Sound warm, professional, and specific — not generic. Do not start with the business name. Under 60 words.`,
    }],
  });
  return msg.content[0]?.text?.trim() || null;
}

/**
 * Analyse booking gaps for a business and suggest actions.
 * gaps = array of { date, day_name, booked_slots, total_slots, gap_count }
 */
async function suggestGapFilling({ businessName, category, gaps, avgBookingsPerDay }) {
  const client = getClient();
  if (!client || !gaps.length) return null;

  const gapSummary = gaps.slice(0, 7).map(g =>
    `${g.day_name} ${g.date}: ${g.gap_count} open slot${g.gap_count !== 1 ? 's' : ''} (${g.booked_slots}/${g.total_slots} filled)`
  ).join('\n');

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `You are a revenue advisor for ${businessName} (${category || 'service business'}). Their average is ${avgBookingsPerDay} bookings/day. Here are their upcoming booking gaps:\n${gapSummary}\n\nWrite one concise recommendation based only on this supplied data. Maximum 55 words. Use plain sentences only: no Markdown, headings, bullets, numbering, bold text, emojis, invented figures, or claims about channels the business has not configured.`,
    }],
  });
  return plainText(msg.content[0]?.text, 360) || null;
}

/**
 * Suggest best staff reassignment when a booking's staff member is unavailable.
 * availableStaff = [{ id, name, role, bookings_today }]
 */
async function suggestStaffReassignment({ serviceName, originalStaffName, availableStaff, bookingDate, bookingTime }) {
  if (!availableStaff.length) return null;
  // Score by fewest bookings today — no Claude call needed for simple case
  const sorted = [...availableStaff].sort((a, b) => (a.bookings_today || 0) - (b.bookings_today || 0));
  return sorted[0]; // return best candidate directly
}

/**
 * Personalise a re-engagement message for a lapsed customer.
 */
async function personaliseReEngagement({ businessName, category, customerName, lastServiceName, daysSince, servicesAvailable }) {
  const client = getClient();
  if (!client) return null;

  const serviceHint = servicesAvailable?.slice(0, 3).map(s => s.name).join(', ') || '';
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `Write a short, friendly re-engagement message (2 sentences max) from ${businessName} to ${customerName || 'a valued customer'} who last visited ${daysSince} days ago for ${lastServiceName || 'a service'}. ${serviceHint ? `Mention one of these: ${serviceHint}.` : ''} Be personal, warm, not salesy. No emojis. No subject line.`,
    }],
  });
  return msg.content[0]?.text?.trim() || null;
}

/**
 * AI chat booking: multi-turn conversational booking assistant.
 * Returns { reply, bookingState } — reply is clean text, bookingState has extracted fields.
 */
async function chatBooking({ businessName, services, availableSlots, messages, bookingState, today }) {
  const client = getClient();
  if (!client) return { reply: "I'm sorry, the AI assistant isn't available right now. Please use the booking form instead.", bookingState };

  const serviceList = services.map(s =>
    `- "${s.name}" (ID: ${s.id}) — £${parseFloat(s.price || 0).toFixed(2)}, ${s.duration_minutes} min${s.description ? ': ' + s.description : ''}`
  ).join('\n');

  const slotInfo = availableSlots?.length
    ? `Available slots on ${bookingState.date}: ${availableSlots.map(s => s.start.slice(0,5)).join(', ')}`
    : bookingState.date && bookingState.service_id
      ? `No slots available on ${bookingState.date} for this service. Ask the customer to choose a different date.`
      : '';

  const stateInfo = Object.entries(bookingState)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const system = `You are a friendly booking assistant for ${businessName}. Today is ${today}.

Services available:
${serviceList}

${slotInfo ? slotInfo + '\n' : ''}Current booking state: ${stateInfo || 'nothing collected yet'}

Your job: have a natural conversation to collect all these fields:
- service_id (match to a service above by name — use the exact ID)
- service_name
- date (YYYY-MM-DD format — interpret relative dates like "Saturday" or "tomorrow" relative to today)
- time (HH:MM:SS from available slots)
- customer_name
- customer_phone

Rules:
- Ask for one or two things at a time, don't dump a form on the user
- When suggesting dates, offer 2–3 specific upcoming dates by name (e.g. "Saturday 30 August")
- If a date is chosen and you don't yet have slots info, acknowledge the date and say you're checking availability
- Once all 5 required fields (service_id, date, time, customer_name, customer_phone) are set, summarise the booking clearly and say you're ready to confirm
- customer_email is optional — don't block on it
- Be warm, concise, and helpful — no corporate speak
- Keep replies short (2–4 sentences max)

After your conversational reply, on a NEW LINE output a JSON block with any newly extracted or confirmed fields to update:
<<<STATE_UPDATE>>>
{"service_id":"...", "service_name":"...", "date":"YYYY-MM-DD", "time":"HH:MM:SS", "customer_name":"...", "customer_phone":"...", "customer_email":"..."}
<<<END_STATE>>>
Only include fields you are confident about. Omit fields you don't know yet. Use null to clear a wrong field.`;

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages,
  });

  const raw = msg.content[0]?.text?.trim() || '';

  // Extract state update JSON block
  const stateMatch = raw.match(/<<<STATE_UPDATE>>>([\s\S]*?)<<<END_STATE>>>/);
  let updatedState = { ...bookingState };
  if (stateMatch) {
    try {
      const patch = JSON.parse(stateMatch[1].trim());
      for (const [k, v] of Object.entries(patch)) {
        if (v !== null && v !== undefined && v !== '') {
          updatedState[k] = v;
        } else if (v === null) {
          delete updatedState[k];
        }
      }
    } catch {}
  }

  // Strip the state block from the reply shown to the user
  const reply = raw.replace(/<<<STATE_UPDATE>>>[\s\S]*?<<<END_STATE>>>/g, '').trim();

  const readyToBook = !!(updatedState.service_id && updatedState.date && updatedState.time && updatedState.customer_name && updatedState.customer_phone);

  return { reply, bookingState: updatedState, readyToBook };
}

module.exports = { summarizeReviews, scoreNoShowRisk, suggestRebookTiming, matchServiceQuery, chatBooking, generateBusinessDescription, suggestGapFilling, suggestStaffReassignment, personaliseReEngagement };
