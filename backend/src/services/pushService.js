const db = require('../config/database');

// APNs tokens are 64-char hex strings. FCM tokens are much longer.
function isApnsToken(token) {
  return typeof token === 'string' && /^[0-9a-f]{64}$/i.test(token.trim());
}

// Lazy APNs provider — created once on first use
let _apnProvider;
function getApnProvider() {
  if (_apnProvider) return _apnProvider;
  const keyBase64 = process.env.APN_KEY_BASE64;
  const keyId     = process.env.APN_KEY_ID;
  const teamId    = process.env.APN_TEAM_ID;
  if (!keyBase64 || !keyId || !teamId) return null;
  const apn = require('apn');
  _apnProvider = new apn.Provider({
    token: {
      key:    Buffer.from(keyBase64, 'base64'),
      keyId,
      teamId,
    },
    production: process.env.NODE_ENV === 'production',
  });
  return _apnProvider;
}

async function sendViaApns(tokens, { title, body, data = {} }) {
  const provider = getApnProvider();
  if (!provider) {
    console.log('[Push/APNs] APN_KEY_BASE64 / APN_KEY_ID / APN_TEAM_ID not set — skipping');
    return;
  }
  const apn = require('apn');
  const note = new apn.Notification();
  note.alert  = { title, body };
  note.topic  = 'business.bookam.app';
  note.sound  = 'default';
  note.badge  = 1;
  note.payload = data;

  const result = await provider.send(note, tokens);
  if (result.failed.length) console.warn('[Push/APNs] Failed:', result.failed.length);
}

async function sendViaFcm(tokens, { title, body, data = {} }) {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.log('[Push/FCM] No FIREBASE_SERVICE_ACCOUNT_JSON — skipping');
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
    const projectId   = serviceAccount.project_id;

    await Promise.allSettled(
      tokens.map(token =>
        fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
              android: { priority: 'high', notification: { sound: 'default' } },
            },
          }),
        }).then(r => r.json())
      )
    );
  } catch (err) {
    console.error('[Push/FCM] error:', err.message);
  }
}

async function sendPush(tokens, payload) {
  if (!tokens?.length) return;
  const apnsTokens = tokens.filter(isApnsToken);
  const fcmTokens  = tokens.filter(t => !isApnsToken(t));
  if (apnsTokens.length) await sendViaApns(apnsTokens, payload);
  if (fcmTokens.length)  await sendViaFcm(fcmTokens, payload);
}

async function saveToken(token, userType, userId) {
  await db.query(
    `INSERT INTO push_tokens (token, user_type, user_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (token) DO UPDATE SET user_type = $2, user_id = $3, updated_at = NOW()`,
    [token, userType, userId]
  );
}

async function removeToken(token) {
  await db.query('DELETE FROM push_tokens WHERE token = $1', [token]);
}

async function getTokens(userType, userId) {
  const { rows } = await db.query(
    'SELECT token FROM push_tokens WHERE user_type = $1 AND user_id = $2',
    [userType, userId]
  );
  return rows.map(r => r.token);
}

async function notifyUser(userType, userId, payload) {
  const tokens = await getTokens(userType, userId);
  await sendPush(tokens, payload);
}

module.exports = { saveToken, removeToken, getTokens, sendPush, notifyUser };
