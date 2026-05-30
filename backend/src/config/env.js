function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  const allowIncomplete = process.env.ALLOW_INCOMPLETE_PRODUCTION_ENV === 'true';

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    // Accept either name for the admin password (old: ADMIN_CHAT_PASSWORD, new: ADMIN_SUPPORT_PASSWORD)
    ['ADMIN_SUPPORT_PASSWORD', 'ADMIN_CHAT_PASSWORD'],
    'FRONTEND_URL',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const missingVars = [];
  for (const entry of required) {
    const names = Array.isArray(entry) ? entry : [entry];
    const missing = names.every(n => !process.env[n]);
    if (missing) {
      missingVars.push(names.join(' or '));
    }
  }

  if (missingVars.length) {
    const message = `[env] MISSING env vars: ${missingVars.join(', ')} — refusing production start because core features will not work`;
    if (!allowIncomplete) throw new Error(message);
    console.error(`${message}. ALLOW_INCOMPLETE_PRODUCTION_ENV=true is set, continuing anyway.`);
  }

  if ((process.env.JWT_SECRET || '').length < 32 || process.env.JWT_SECRET === 'bookam-jwt-secret-change-in-prod') {
    const message = '[env] JWT_SECRET is weak or using the dev fallback — set a strong secret in Render';
    if (!allowIncomplete) throw new Error(message);
    console.error(`${message}. Continuing because ALLOW_INCOMPLETE_PRODUCTION_ENV=true.`);
  }

  const adminPassword = process.env.ADMIN_SUPPORT_PASSWORD || process.env.ADMIN_CHAT_PASSWORD || '';
  if (!adminPassword || adminPassword.length < 16 || adminPassword === 'bookam-support-2024') {
    const message = '[env] ADMIN_SUPPORT_PASSWORD is missing or weak — set it in Render env vars';
    if (!allowIncomplete) throw new Error(message);
    console.error(`${message}. Continuing because ALLOW_INCOMPLETE_PRODUCTION_ENV=true.`);
  }

  if (!/^https:\/\//i.test(process.env.FRONTEND_URL || '')) {
    const message = '[env] FRONTEND_URL should be an https:// URL in production';
    if (!allowIncomplete) throw new Error(message);
    console.error(`${message}. Continuing because ALLOW_INCOMPLETE_PRODUCTION_ENV=true.`);
  }
}

module.exports = { validateProductionEnv };
