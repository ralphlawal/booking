const db = require('../config/database');

// Auto-verify a business when it has: description + location + logo + ≥1 active service
async function checkAutoVerify(businessId) {
  try {
    const { rows: [biz] } = await db.query(
      'SELECT is_verified, logo_url, description, location FROM businesses WHERE id = $1',
      [businessId]
    );
    if (!biz || biz.is_verified) return;

    const hasProfile = !!(biz.description?.trim() && biz.location?.trim() && biz.logo_url);
    if (!hasProfile) return;

    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*) FROM services WHERE business_id = $1 AND is_active = TRUE',
      [businessId]
    );

    if (parseInt(count) >= 1) {
      await db.query('UPDATE businesses SET is_verified = TRUE WHERE id = $1', [businessId]);
      console.log(`[auto-verify] Business ${businessId} auto-verified`);
    }
  } catch (err) {
    console.error('[auto-verify]', err.message);
  }
}

module.exports = { checkAutoVerify };
