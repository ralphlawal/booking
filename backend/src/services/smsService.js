const sendSms = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (sid && token && from) {
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({ body, from, to });
  } else {
    // Do not write phone numbers or one-time codes to application logs.
    console.warn('[SMS not sent: provider is not configured]');
  }
};

module.exports = { sendSms };
