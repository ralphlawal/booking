const crypto = require('crypto');

const generateReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefix = 'BK';
  const suffix = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${prefix}${suffix}`;
};

module.exports = generateReference;
