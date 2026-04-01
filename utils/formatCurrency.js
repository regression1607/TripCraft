const currencySymbols = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
  JPY: '\u00A5',
};

export function formatCurrency(amount, currency = 'USD') {
  const symbol = currencySymbols[currency] || '$';
  return `${symbol}${Math.round(amount || 0).toLocaleString()}`;
}
