const app = require('../src/app');

function request(base, path, options = {}) {
  return fetch(`${base}${path}`, options).then(async (res) => ({
    status: res.status,
    body: await res.text(),
  }));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const health = await request(base, '/api/health');
    assert(health.status === 200, `Expected /api/health 200, got ${health.status}`);
    assert(health.body.includes('"ok"'), '/api/health did not return ok status');

    const adminStats = await request(base, '/api/admin/stats');
    assert(adminStats.status === 403, `Expected protected /api/admin/stats 403, got ${adminStats.status}`);

    const adminChat = await request(base, '/api/chat/admin/rooms');
    assert(adminChat.status === 403, `Expected protected /api/chat/admin/rooms 403, got ${adminChat.status}`);

    const consumerBookings = await request(base, '/api/consumer/bookings');
    assert(consumerBookings.status === 401, `Expected protected /api/consumer/bookings 401, got ${consumerBookings.status}`);

    const missing = await request(base, '/api/definitely-missing');
    assert(missing.status === 404, `Expected missing route 404, got ${missing.status}`);

    console.log('Backend smoke checks passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((err) => {
  console.error(`Backend smoke checks failed: ${err.message}`);
  process.exit(1);
});
