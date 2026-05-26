// Vercel Edge Function — proxies all /api/* requests to Render server-to-server.
// The browser calls its own domain (no CORS). Render gets a server-to-server call (no CORS).
export const config = { runtime: 'edge' };

// BACKEND_URL should be set in Vercel env vars. Falls back to the known Render URL.
const BACKEND = process.env.BACKEND_URL || 'https://bookly-api-3bz0.onrender.com';

export default async function handler(req) {
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

    const responseHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      if (!['access-control-allow-origin', 'content-encoding', 'content-length'].includes(k.toLowerCase())) {
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
