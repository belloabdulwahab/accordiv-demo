import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMPTY_ENQUIRY, ENQUIRY_FORM_NAME, ENQUIRY_LIMITS, validateEnquiry, submitEnquiry, netlifyFormReady } from '../src/services/enquiry.js';
import { SERVICE_PACKAGES } from '../src/config/servicePackages.js';
import { MARKETING_CONTACT } from '../src/config/marketingContact.js';

const valid = { ...EMPTY_ENQUIRY, name: 'Test Contact', email: 'test@example.com', service: 'general-enquiry', message: 'Please discuss suitability.' };
const definition = processed => ({ hasAttribute: name => name === 'data-netlify' && !processed,
  querySelector: () => ({ value: ENQUIRY_FORM_NAME }) });
const doc = processed => ({ getElementById: () => definition(processed) });

test('enquiries require contact, email, service and message while other fields remain optional', () => {
  assert.deepEqual(Object.keys(validateEnquiry(EMPTY_ENQUIRY).errors).sort(), ['email','message','name','service']);
  assert.equal(validateEnquiry(valid).ok, true);
  assert.equal(validateEnquiry({ ...valid, email: 'bad' }).ok, false);
  assert.equal(validateEnquiry({ ...valid, service: 'unknown' }).ok, false);
  for (const item of SERVICE_PACKAGES) assert.equal(validateEnquiry({ ...valid, service: item.value }).ok, true);
  for (const [key, limit] of Object.entries(ENQUIRY_LIMITS)) assert.ok(validateEnquiry({ ...valid, [key]: 'x'.repeat(limit + 1) }).errors[key]);
});

test('new enquiry phones retain the leading zero and reject unsupported formats', () => {
  assert.equal(validateEnquiry({ ...valid, phone: ' 09012345678 ' }).values.phone, '09012345678');
  for (const phone of ['+2349012345678','090 12345678','abcdefghijk','19012345678','0901234567','090123456789','\uff10\uff19\uff10\uff11\uff12\uff13\uff14\uff15\uff16\uff17\uff18']) {
    assert.ok(validateEnquiry({ ...valid, phone }).errors.phone, phone);
  }
});

test('budget is optional, supports uncertainty or a decimal amount without another basis field', () => {
  for (const budget of ['', 'Not sure yet', 'not SURE yet', '150000', '0', '150000.50']) assert.equal(validateEnquiry({ ...valid, budget }).ok, true);
  for (const budget of ['-1','150,000','1e6','NaN','20.001']) assert.ok(validateEnquiry({ ...valid, budget }).errors.budget);
  assert.equal(Object.keys(EMPTY_ENQUIRY).some(key => key.includes('basis')), false);
});

test('static detection and ordinary local/static servers cannot report a fake success', async () => {
  assert.equal(netlifyFormReady(undefined), false);
  assert.equal(netlifyFormReady(doc(false)), false);
  assert.equal(netlifyFormReady(doc(true)), true);
  let calls = 0;
  await assert.rejects(submitEnquiry(valid, { doc: doc(false), fetcher: async () => { calls++; return { ok: true }; } }), /Nothing has been sent/);
  assert.equal(calls, 0);
});

test('controlled Netlify submission encodes fields, email reply-to and honeypot without calling PHP', async () => {
  let called;
  const values = { ...valid, message: 'Brand & scope + details?', 'bot-field': '' };
  await submitEnquiry(values, { doc: doc(true), fetcher: async (path, options) => { called = { path, ...options }; return { ok: true }; } });
  assert.equal(called.path, '/'); assert.equal(called.method, 'POST');
  assert.equal(called.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const body = new URLSearchParams(called.body);
  assert.equal(body.get('form-name'), ENQUIRY_FORM_NAME);
  assert.equal(body.get('email'), valid.email); assert.equal(body.get('message'), values.message);
  assert.equal(body.has('bot-field'), true);
  await assert.rejects(submitEnquiry(valid, { doc: doc(true), fetcher: async () => ({ ok: false }) }), /could not be confirmed/);
  await assert.rejects(submitEnquiry(valid, { doc: doc(true), fetcher: async () => { throw Error('Controlled failure'); } }), /Controlled failure/);
});

test('static form definition matches every submitted field and configured public destinations', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const staticForm = html.match(/<form id="netlify-enquiry-definition"[\s\S]*?<\/form>/)[0];
  const names = [...staticForm.matchAll(/<(?:input|select|textarea)\b[^>]*\bname="([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(names, ['form-name', ...Object.keys(EMPTY_ENQUIRY)].sort());
  assert.match(staticForm, /data-netlify="true"/); assert.match(staticForm, /netlify-honeypot="bot-field"/);
  assert.equal(MARKETING_CONTACT.instagram, 'https://www.instagram.com/bao2dwrld_/');
  assert.equal(MARKETING_CONTACT.x, 'https://x.com/bao2dwrld_');
  assert.equal(MARKETING_CONTACT.portfolio, 'https://www.belloabdulwahab.dev/');
});
