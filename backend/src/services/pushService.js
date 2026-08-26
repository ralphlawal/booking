const db = require('../config/database');

// Save or update an FCM push token for a user
async function saveToken(token, userType, userId) {
  await db.query(
    `INSERT INTO push_tokens (token, user_type, user_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (token) DO UPDATE SET user_type = $2, user_id = $3, updated_at = NOW()`,
    [token, userType, userId]
  );
}

// Remove a token (on logout)
async function removeToken(token) {
  await db.query('DELETE FROM push_tokens WHERE token = $1', [token]);
}

// Get all FCM tokens for a user
async function getTokens(userType, userId) {
  const { rows } = await db.query(
    'SELECT token FROM push_tokens WHERE user_type = $1 AND user_id = $2',
    [userType, userId]
  );
  return rows.map(r => r.token);
}

// Send a push notification via FCM HTTP v1 API
// Requires FIREBASE_SERVICE_ACCOUNT_JSON env var (base64-encoded service account JSON)
async function sendPush(tokens, { title, body, data = {} }) {
  if (!tokens?.length) return;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.log('[Push] No FIREBASE_SERVICE_ACCOUNT_JSON — skipping push');
    return;
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(saJson, 'base64').toString('utf8'));
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const accessToken = await auth.getAccessToken();
    const projectId = serviceAccount.project_id;

    const results = await Promise.allSettled(
      tokens.map(token =>
        fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
              apns: { payload: { aps: { sound: 'default', badge: 1 } } },
              android: { priority: 'high', notification: { sound: 'default' } },
            },
          }),
        }).then(r => r.json())
      )
    );

    const failed = results.filter(r => r.status === 'rejected' || r.value?.error);
    if (failed.length) console.warn('[Push] Some tokens failed:', failed.length);
  } catch (err) {
    console.error('[Push] sendPush error:', err.message);
  }
}

// Send push to a specific business or consumer user
async function notifyUser(userType, userId, payload) {
  const tokens = await getTokens(userType, userId);
  await sendPush(tokens, payload);
}

module.exports = { saveToken, removeToken, getTokens, sendPush, notifyUser };
