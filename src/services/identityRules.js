export const PHONE_GUIDANCE = 'Optional. Use exactly 11 digits starting with 0, for example 08012345678. This checks the format, not whether the number exists.';
export function validNigerianPhone(value) { return value === '' || /^0[0-9]{10}$/.test(value); }
// Preserve an unchanged historical phone; apply the current format only to a new or changed value.
export function phoneError(value, previous, raw) {
  return previous !== undefined && (raw === undefined || raw === previous) || validNigerianPhone(value)
    ? '' : 'Use exactly 11 digits starting with 0, without letters or separators.';
}
export function normalizeIdentity(value = '') {
  return value.replace(/[\p{White_Space}\uFEFF]+/gu, ' ').trim().toLowerCase().replace(/\u03c2/g, '\u03c3');
}
// Bind confirmation to the current match details so a changed review cannot be silently reused.
export function possibleDuplicateReview(data, collection, value, existing) {
  if (!['clients', 'projects'].includes(collection)) return null;
  const identity = collection === 'clients'
    ? [normalizeIdentity(value.contact), normalizeIdentity(value.company)]
    : [value.clientId, normalizeIdentity(value.name)];
  const previous = existing && (collection === 'clients'
    ? [normalizeIdentity(existing.contact), normalizeIdentity(existing.company)]
    : [existing.clientId, normalizeIdentity(existing.name)]);
  if (previous && JSON.stringify(previous) === JSON.stringify(identity)) return null;
  const matches = data[collection].filter(record => record.id !== existing?.id &&
    (collection === 'clients'
      ? normalizeIdentity(record.contact) === identity[0] && normalizeIdentity(record.company) === identity[1]
      : record.clientId === identity[0] && normalizeIdentity(record.name) === identity[1]))
    .map(record => collection === 'clients'
      ? { id: record.id, name: record.name, contact: record.contact, company: record.company, email: record.email, phone: record.phone, archived: record.archived, updatedAt: record.updatedAt }
      : { id: record.id, name: record.name, status: record.status, startDate: record.startDate, deadline: record.deadline, archived: record.archived, updatedAt: record.updatedAt });
  if (!matches.length) return null;
  return { kind: collection, matches, token: JSON.stringify([collection, existing?.id || null, identity, matches]) };
}
