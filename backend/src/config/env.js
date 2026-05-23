function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_SUPPORT_PASSWORD',
    'FRONTEND_URL',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ].forEach(requireEnv);
}

module.exports = { validateProductionEnv };
