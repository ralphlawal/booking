const db = require('../config/database');

// Auto-verify criteria:
// 1. Has description, location, logo (good profile)
// 2. Has at least 1 active service
// 3. Has submitted verification details (company reg OR sole trader declaration)
async function checkAutoVerify(businessId) {
  try {
    const { rows: [biz] } = await db.query(
      `SELECT is_verified, verification_status, logo_url, description, location,
              phone, email, verification_details
       FROM businesses WHERE id = $1`,
      [businessId]
    );
    if (!biz || biz.is_verified || biz.verification_status === 'verified') return false;

    const hasProfile = !!(biz.description?.trim() && biz.location?.trim() && biz.logo_url);
    if (!hasProfile) return false;

    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*) FROM services WHERE business_id = $1 AND is_active = TRUE',
      [businessId]
    );
    if (parseInt(count) < 1) return false;

    const details = biz.verification_details || {};
    const hasVerificationData = !!(
      details.legal_name &&
      (details.company_reg_number || details.sole_trader === true) &&
      biz.phone?.trim() &&
      biz.email?.trim()
    );
    if (!hasVerificationData) return false;

    await db.query(
      `UPDATE businesses SET is_verified = TRUE, verification_status = 'verified',
       verified_at = NOW() WHERE id = $1`,
      [businessId]
    );
    console.log(`[auto-verify] Business ${businessId} auto-verified`);
    return true;
  } catch (err) {
    console.error('[auto-verify]', err.message);
    return false;
  }
}

module.exports = { checkAutoVerify };
