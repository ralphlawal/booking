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

// For business-admin pages that display amounts with no per-item currency of
// their own (services, customers, staff commission, growth stats). Reads the
// logged-in business's currency straight from the same auth cache AuthContext
// writes on login, so it's correct without threading business through props.
export function businessCurrencySymbol() {
  try {
    const cache = JSON.parse(localStorage.getItem('bookam_biz_auth') || 'null');
    return currencySymbol(cache?.business?.bank_currency);
  } catch {
    return '£';
  }
}
