// One place to turn a currency code into a symbol. The app is £-first; a
// business's currency comes from its payout settings (bank_currency).
const SYMBOLS = {
  GBP: '£', EUR: '€', USD: '$', CAD: '$', AUD: '$', NZD: '$',
  NGN: '₦', ZAR: 'R', INR: '₹', AED: 'د.إ', KES: 'KSh', GHS: 'GH₵',
};

export function currencySymbol(code) {
  if (!code) return '£';
  return SYMBOLS[String(code).toUpperCase()] || '£';
}

// Format a numeric amount with the right symbol, e.g. money(30, 'GBP') → "£30.00".
export function money(amount, code, { decimals = 2 } = {}) {
  const n = Number(amount || 0);
  return `${currencySymbol(code)}${n.toFixed(decimals)}`;
}
