const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const fractionalCurrency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// All stored and calculated money is integer kobo. Format only at the UI boundary.
export function formatMoney(minorUnits) {
  const amount = BigInt(minorUnits);
  const cents = amount % 100n;
  if (!cents) return currency.format(amount / 100n);
  return fractionalCurrency
    .formatToParts(amount / 100n)
    .map((part) => (part.type === 'fraction' ? String(cents).padStart(2, '0') : part.value))
    .join('');
}

// Decimal input is converted using integer arithmetic, never floating-point rounding.
// Keep the input as decimal text until its whole and fractional parts have become integer kobo.
export function parseMoneyInput(input) {
  if (
    typeof input !== 'string' ||
    !/^\d+(?:\.\d{1,2})?$/.test(input.trim()) ||
    input.trim().length > 30
  )
    throw new Error('Enter a non-negative amount with up to two decimal places, without commas.');
  const [whole, fraction = ''] = input.trim().split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('This amount is too large to store safely.');
  return Number(minor);
}

export function moneyInputValue(minorUnits) {
  const amount = BigInt(minorUnits);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}
