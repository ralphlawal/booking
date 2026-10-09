const db = require('../config/database');

const TRIAL_DAYS = 14;
const FREE_CALLS_PER_MONTH = 3;

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Middleware: checks AI usage limits for authenticated business users.
// Trial: 14 days from account creation — unlimited.
// After trial: 50 AI calls per calendar month.
// Increments usage counter on every allowed request.
async function aiGate(req, res, next) {
  if (!req.business?.id) return next();

  try {
    const { rows } = await db.query(
      'SELECT created_at, ai_trial_ends_at, ai_calls_this_month, ai_month_key, ai_plan FROM businesses WHERE id=$1',
      [req.business.id]
    );
    const biz = rows[0];
    if (!biz) return next();

    // Set trial end date on first AI call if not already set
    let trialEndsAt = biz.ai_trial_ends_at;
    if (!trialEndsAt) {
      const start = new Date(biz.created_at || Date.now());
      start.setDate(start.getDate() + TRIAL_DAYS);
      trialEndsAt = start.toISOString();
      await db.query('UPDATE businesses SET ai_trial_ends_at=$1 WHERE id=$2', [trialEndsAt, req.business.id]);
    }

    // Still in trial — allow freely
    if (new Date() < new Date(trialEndsAt)) {
      return next();
    }

    // Manual upgrade — unlimited
    if (biz.ai_plan === 'pro') return next();

    // Reset counter at start of new calendar month
    const mk = monthKey();
    let calls = biz.ai_calls_this_month || 0;
    if (biz.ai_month_key !== mk) {
      calls = 0;
      await db.query('UPDATE businesses SET ai_calls_this_month=0, ai_month_key=$1 WHERE id=$2', [mk, req.business.id]);
    }

    if (calls >= FREE_CALLS_PER_MONTH) {
      return res.status(402).json({
        error: 'AI limit reached',
        code: 'AI_LIMIT_REACHED',
        used: calls,
        limit: FREE_CALLS_PER_MONTH,
        reset: `1st of next month`,
      });
    }

    // Increment usage
    await db.query(
      'UPDATE businesses SET ai_calls_this_month=COALESCE(ai_calls_this_month,0)+1, ai_month_key=$1 WHERE id=$2',
      [mk, req.business.id]
    );

    next();
  } catch (err) {
    console.error('[aiGate]', err.message);
    next(); // fail open — don't block if DB error
  }
}

module.exports = { aiGate };
