export function safeMinor(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Money must be a non-negative safe integer in kobo.');
  return value;
}

function fromBigInt(value) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('The total exceeds the safe money limit.');
  return Number(value);
}

// Calculate with BigInt, then reject totals that the shared Number-based model cannot store exactly.
export function sumMoney(values) {
  return fromBigInt(values.reduce((sum, value) => sum + BigInt(safeMinor(value)), 0n));
}

export function lineTotal(item) {
  if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)
    throw new Error('Quantity must be a positive whole number.');
  return fromBigInt(BigInt(item.quantity) * BigInt(safeMinor(item.unitAmount)));
}
