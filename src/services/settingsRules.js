import { DEMO_ISSUER, DEMO_PAYMENT_INSTRUCTIONS } from '../config/demoBusiness.js';
import { phoneError } from './identityRules.js';
import { validEmail } from './recordRules.js';
import { addDays } from '../utils/date.js';

export const SETTINGS_LIMITS = {
  name: 200,
  email: 254,
  phone: 50,
  address: 500,
  website: 500,
  defaultNotes: 5000,
  defaultPaymentInstructions: 5000,
};
export const DEFAULT_SETTINGS = Object.freeze({
  name: DEMO_ISSUER.name,
  email: DEMO_ISSUER.email,
  phone: DEMO_ISSUER.phone,
  address: DEMO_ISSUER.address,
  website: '',
  defaultNotes: '',
  defaultPaymentInstructions: DEMO_PAYMENT_INSTRUCTIONS,
  paymentTermDays: 30,
  currency: 'NGN',
});

export function safeHttpUrl(value) {
  if (
    typeof value !== 'string' ||
    !/^https?:\/\//i.test(value) ||
    /[\s\\]/u.test(value) ||
    [...value].some(
      (character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127,
    )
  )
    return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      url.hostname &&
      !url.username &&
      !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}

export function validateSettings(input, existing) {
  const errors = {},
    value = { currency: 'NGN' };
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { value, errors: { name: 'Enter valid business settings.' } };
  for (const [key, max] of Object.entries(SETTINGS_LIMITS)) {
    value[key] = typeof input[key] === 'string' ? input[key].trim() : '';
    if (input[key] !== undefined && typeof input[key] !== 'string')
      errors[key] = 'Enter text for this field.';
    else if (value[key].length > max)
      errors[key] = `Use ${max.toLocaleString('en')} characters or fewer.`;
  }
  const phoneIssue = phoneError(value.phone, existing?.phone, input.phone);
  if (phoneIssue) errors.phone = phoneIssue;
  if (existing && (input.phone === undefined || input.phone === existing.phone)) value.phone = existing.phone;
  if (!value.name) errors.name = 'Enter a business name.';
  if (value.email && !validEmail(value.email)) errors.email = 'Enter a valid contact email.';
  if (value.website && !safeHttpUrl(value.website))
    errors.website = 'Use a full HTTP or HTTPS URL without spaces or sign-in credentials.';
  const days =
    typeof input.paymentTermDays === 'number'
      ? String(input.paymentTermDays)
      : input.paymentTermDays;
  if (typeof days !== 'string' || !/^\d{1,3}$/.test(days.trim()) || Number(days) > 365)
    errors.paymentTermDays = 'Use a whole number of days from 0 to 365.';
  else value.paymentTermDays = Number(days.trim());
  if (input.currency !== undefined && input.currency !== 'NGN')
    errors.currency = 'NGN is the only supported currency.';
  return { value, errors };
}

export function validStoredSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  if (typeof settings.phone !== 'string' || settings.phone.length > SETTINGS_LIMITS.phone) return false;
  const { value, errors } = validateSettings(settings, settings);
  return (
    !Object.keys(errors).length && Object.keys(value).every((key) => value[key] === settings[key])
  );
}

export function issuerFromSettings(settings = DEFAULT_SETTINGS) {
  return {
    name: settings.name,
    company: settings.name,
    contact: '',
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    website: settings.website,
  };
}

// Defaults apply when creating a draft; saving settings must not rewrite existing invoices.
export function newInvoiceDefaults(settings = DEFAULT_SETTINGS, today) {
  return {
    clientId: '',
    projectId: '',
    issuedDate: today,
    dueDate: addDays(today, settings.paymentTermDays),
    notes: settings.defaultNotes,
    paymentInstructions: settings.defaultPaymentInstructions,
    items: [{ description: '', quantity: '1', unitPrice: '' }],
  };
}
