const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ralph-lawal-group';

// Cache Google's public keys (rotate every ~6 hours)
let _publicKeys = null;
let _keysFetchedAt = 0;

async function getFirebasePublicKeys() {
  if (_publicKeys && Date.now() - _keysFetchedAt < 3_600_000) return _publicKeys;
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  _publicKeys = await res.json();
  _keysFetchedAt = Date.now();
  return _publicKeys;
}

async function verifyFirebaseToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw new Error('Malformed token');
  const keys = await getFirebasePublicKeys();
  const publicKey = keys[decoded.header.kid];
  if (!publicKey) throw new Error('Unknown key ID');
  return jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });
}

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.decode(token, { complete: true });

    if (decoded?.payload?.iss?.includes('securetoken.google.com')) {
      // Firebase ID token
      const payload = await verifyFirebaseToken(token);
      const user = await User.findByFirebaseUid(payload.uid);
      if (!user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      req.user = user;
    } else {
      // Legacy JWT (backward compat for any existing sessions)
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
};

const attachBusiness = async (req, res, next) => {
  const business = await Business.findByUserId(req.user.id);
  if (!business) {
    return res.status(404).json({ error: 'Business profile not found. Complete your setup.' });
  }
  req.business = business;
  next();
};

module.exports = { authenticate, attachBusiness, verifyFirebaseToken };
