// Vercel Edge Function — proxies all /api/* requests to Render server-to-server.
// The browser calls its own domain (no CORS). Render gets a server-to-server call (no CORS).
export const config = { runtime: 'edge' };

// VITE_* vars are build-time only and unavailable in edge functions at runtime.
// Fall back to the known Render URL so the proxy always works even if BACKEND_URL
// is not explicitly set in Vercel environment variables.
const BACKEND = process.env.BACKEND_URL || 'https://bookly-api-3bz0.onrender.com';

export default async function handler(req) {
  if (!BACKEND) {
    return new Response(JSON.stringify({ error: 'Backend proxy is not configured' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const url = new URL(req.url);

  // Build the target URL: /api/proxy/auth/me → /api/auth/me
  const targetPath = url.pathname.replace(/^\/api\/proxy/, '/api');
  const target = `${BACKEND.replace(/\/$/, '')}${targetPath}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get('content-type');
  if (ct) headers.set('content-type', ct);
  const auth = req.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((v, k) => responseHeaders.set(k, v));
  // Ensure no CORS headers are needed — same origin from browser's perspective
  responseHeaders.delete('access-control-allow-origin');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
