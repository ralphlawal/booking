const sendSms = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from) {
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({ body, from, to });
  } else {
    // Dev fallback — log OTP to console
    console.log(`[SMS to ${to}]: ${body}`);
  }
};

module.exports = { sendSms };
