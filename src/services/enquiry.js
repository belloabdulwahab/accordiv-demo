import { SERVICE_PACKAGES } from '../config/servicePackages.js';

export const ENQUIRY_FORM_NAME = 'accordiv-enquiry';
export const ENQUIRY_LIMITS = Object.freeze({ name: 200, email: 254, phone: 11,
  business: 200, service: 80, message: 3000, integrations: 2000, budget: 100 });
export const EMPTY_ENQUIRY = Object.freeze({ name: '', email: '', phone: '', business: '',
  service: '', message: '', integrations: '', budget: '', 'bot-field': '' });

export function validateEnquiry(input) {
  const values = Object.fromEntries(Object.keys(EMPTY_ENQUIRY).map(key =>
    [key, typeof input[key] === 'string' ? input[key].trim() : '']));
  const errors = {};
  for (const [key, limit] of Object.entries(ENQUIRY_LIMITS)) {
    if (values[key].length > limit) errors[key] = 'Use ' + limit + ' characters or fewer.';
  }
  for (const key of ['name', 'email', 'service', 'message']) {
    if (!values[key]) errors[key] = 'Please complete this field.';
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (values.phone && !/^0[0-9]{10}$/.test(values.phone)) errors.phone = 'Use 11 digits starting with 0, without spaces or a country code.';
  if (values.service && !SERVICE_PACKAGES.some(item => item.value === values.service)) errors.service = 'Choose one of the listed services.';
  if (values.budget && !/^not sure yet$/i.test(values.budget) && !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(values.budget)) {
    errors.budget = 'Enter an amount in naira without commas, leave blank, or write Not sure yet.';
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

// Netlify removes data-netlify when it detects this static form at deploy time.
// Ordinary local servers retain it, so do not treat their generic HTTP 200 as an enquiry receipt.
// This checks expected deployment markup; it is not a server-side security check.
export function netlifyFormReady(doc) {
  const definition = doc?.getElementById('netlify-enquiry-definition');
  return Boolean(definition && !definition.hasAttribute('data-netlify') &&
    !definition.hasAttribute('netlify') &&
    definition.querySelector('input[name="form-name"]')?.value === ENQUIRY_FORM_NAME);
}

/**
 * Posts the matching static-form fields directly to Netlify, never to the owner API.
 * A failed or aborted request does not establish receipt; the form keeps the visitor's entries.
 */
export async function submitEnquiry(values, { doc = globalThis.document, fetcher = globalThis.fetch, signal } = {}) {
  if (!netlifyFormReady(doc)) {
    throw new Error('Online enquiries are unavailable on this local or unconfigured site. Your entries are kept. Contact us on WhatsApp or by email instead. Nothing has been sent.');
  }
  const body = new URLSearchParams({ 'form-name': ENQUIRY_FORM_NAME, ...values });
  const response = await fetcher('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(), signal });
  if (!response.ok) throw new Error('Submission could not be confirmed. Your entries are kept. Please contact us on WhatsApp or by email before retrying.');
}
