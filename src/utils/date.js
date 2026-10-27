const dayMs = 86_400_000;

// Demo dates follow the browser calendar; owner pages receive today from the API.
export function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// UTC arithmetic keeps date-only values stable across daylight-saving and timezone changes.
export function addDays(value, days) {
  return new Date(new Date(`${value}T00:00:00Z`).getTime() + days * dayMs)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / dayMs);
}

export function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${value}T00:00:00Z`));
}
