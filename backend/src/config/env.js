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

  if ((process.env.JWT_SECRET || '').length < 32 || process.env.JWT_SECRET === 'bookam-jwt-secret-change-in-prod') {
    throw new Error('JWT_SECRET must be at least 32 characters and must not use the development fallback');
  }

  const adminPassword = process.env.ADMIN_SUPPORT_PASSWORD || process.env.ADMIN_CHAT_PASSWORD || '';
  if (adminPassword.length < 16 || adminPassword === 'bookam-support-2024') {
    throw new Error('ADMIN_SUPPORT_PASSWORD must be at least 16 characters and must not use the development fallback');
  }

  if (!/^https:\/\//i.test(process.env.FRONTEND_URL || '')) {
    throw new Error('FRONTEND_URL must be an https:// URL in production');
  }
}

module.exports = { validateProductionEnv };
