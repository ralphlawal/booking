// Vercel Edge Function — proxies all /api/* requests to Render server-to-server.
// The browser calls its own domain (no CORS). Render gets a server-to-server call (no CORS).
// Also serves the Capacitor iOS/Android native app which calls from capacitor://localhost.
export const config = { runtime: 'edge' };

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

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);

    const targetPath = url.pathname.startsWith('/api/proxy')
      ? url.pathname.replace(/^\/api\/proxy\/?/, '/api/')
      : url.pathname;
    const target = `${BACKEND.replace(/\/$/, '')}${targetPath}${url.search}`;

    const headers = new Headers();
    for (const key of ['accept', 'content-type', 'authorization', 'stripe-signature']) {
      const value = req.headers.get(key);
      if (value) headers.set(key, value);
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = new Headers(corsHeaders(origin));
    upstream.headers.forEach((v, k) => {
      if (!['access-control-allow-origin', 'access-control-allow-credentials', 'content-encoding', 'content-length'].includes(k.toLowerCase())) {
        responseHeaders.set(k, v);
      }
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return Response.json(
      { error: 'Could not reach BookAm server', detail: err?.message || 'Proxy failed' },
      { status: 502 }
    );
  }
}
