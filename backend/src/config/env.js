function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;
  const strict = process.env.STRICT_PRODUCTION_ENV === 'true';

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
    const message = `[env] MISSING env vars: ${missingVars.join(', ')} — some production features will not work`;
    if (strict) throw new Error(message);
    console.error(message);
  }

  if ((process.env.JWT_SECRET || '').length < 32 || process.env.JWT_SECRET === 'bookam-jwt-secret-change-in-prod') {
    const message = '[env] JWT_SECRET is weak or using the dev fallback — set a strong secret in Render';
    if (strict) throw new Error(message);
    console.error(message);
  }

  const adminPassword = process.env.ADMIN_SUPPORT_PASSWORD || process.env.ADMIN_CHAT_PASSWORD || '';
  if (!adminPassword || adminPassword.length < 16 || adminPassword === 'bookam-support-2024') {
    const message = '[env] ADMIN_SUPPORT_PASSWORD is missing or weak — set it in Render env vars';
    if (strict) throw new Error(message);
    console.error(message);
  }

  if (!/^https:\/\//i.test(process.env.FRONTEND_URL || '')) {
    const message = '[env] FRONTEND_URL should be an https:// URL in production';
    if (strict) throw new Error(message);
    console.error(message);
  }
}

module.exports = { validateProductionEnv };
