// Vercel Node.js serverless function — proxies all /api/* requests to Render server-to-server.
// The browser calls its own domain (no CORS issue for same-origin). Capacitor app calls
// https://bookam.business/api/* (cross-origin from capacitor://localhost) — CORS handled here.

const BACKEND = process.env.BACKEND_URL || 'https://bookly-api-3bz0.onrender.com';

const ALLOWED_ORIGINS = new Set([
  'https://bookam.business',
  'https://www.bookam.business',
  'capacitor://localhost',  // iOS Capacitor native app
  'http://localhost',       // Android Capacitor native app
  'ionic://localhost',      // Ionic native app
]);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://bookam.business';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Stripe-Signature',
    'Access-Control-Max-Age': '86400',
  };
}

function setCors(res, origin) {
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  setCors(res, origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');

    const targetPath = url.pathname.startsWith('/api/proxy')
      ? url.pathname.replace(/^\/api\/proxy\/?/, '/api/')
      : url.pathname;
    const target = `${BACKEND.replace(/\/$/, '')}${targetPath}${url.search}`;

    const forwardHeaders = {};
    for (const key of ['accept', 'content-type', 'authorization', 'stripe-signature']) {
      if (req.headers[key]) forwardHeaders[key] = req.headers[key];
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    let body;
    if (hasBody) {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardHeaders,
      body: hasBody ? body : undefined,
    });

    const skip = new Set([
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'content-encoding',
      'content-length',
      'transfer-encoding',
    ]);
    upstream.headers.forEach((v, k) => {
      if (!skip.has(k.toLowerCase())) res.setHeader(k, v);
    });

    res.status(upstream.status);
    const data = await upstream.arrayBuffer();
    res.end(Buffer.from(data));
  } catch (err) {
    res.status(502).json({
      error: 'Could not reach BookAm server',
      detail: err?.message || 'Proxy failed',
    });
  }
}
