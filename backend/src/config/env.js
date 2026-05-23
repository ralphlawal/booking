function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

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
    throw new Error(`Missing required production env var${missingVars.length === 1 ? '' : 's'}: ${missingVars.join(', ')}`);
  }
}

module.exports = { validateProductionEnv };
