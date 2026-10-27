import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from '../src/data/createDemoData.js';
import { createLegacyDemoData } from './fixtures/legacyDemoData.js';
import { createDemoRepository, DEMO_STORAGE_KEY } from '../src/services/demoRepository.js';
import { migrateDemoData } from '../src/services/demoMigration.js';
import {
  DEFAULT_SETTINGS,
  issuerFromSettings,
  newInvoiceDefaults,
  safeHttpUrl,
  validateSettings,
} from '../src/services/settingsRules.js';
import { invoicePdfDefinition } from '../src/services/invoicePdf.js';
import { dashboardSummary } from '../src/services/finance.js';
import { salesContactLinks } from '../src/services/marketingContact.js';
import { MARKETING_CONTACT, ENQUIRY_TEMPLATE } from '../src/config/marketingContact.js';

const today = '2026-10-02';
const settings = (changes = {}) => ({
  ...DEFAULT_SETTINGS,
  name: 'Example Business',
  email: '',
  website: 'https://example.com/business',
  defaultNotes: 'New notes',
  defaultPaymentInstructions: 'New instructions',
  paymentTermDays: '14',
  ...changes,
});
const invoiceInput = (repo) => ({
  ...newInvoiceDefaults(repo.getSnapshot().data.settings, today),
  clientId: 'client-1',
  items: [{ description: 'Service', quantity: '1', unitPrice: '100.01' }],
});
function setup(storage) {
  const map = new Map();
  const store = storage || {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
  return {
    store,
    repo: createDemoRepository(
      () => store,
      () => createDemoData(today),
      { today: () => today, now: () => `${today}T12:00:00.000Z` },
    ),
  };
}

test('settings trim text, permit optional contact fields and enforce term boundaries', () => {
  for (const days of ['0', '365', 30]) {
    const result = validateSettings(
      settings({
        name: ' Example Business ',
        email: '',
        phone: '08012345678',
        paymentTermDays: days,
      }),
    );
    assert.deepEqual(result.errors, {});
    assert.equal(result.value.name, 'Example Business');
    assert.equal(result.value.paymentTermDays, Number(days));
  }
  for (const days of ['', '-1', '1.5', '1e2', '366', null])
    assert.ok(validateSettings(settings({ paymentTermDays: days })).errors.paymentTermDays);
  assert.ok(validateSettings(settings({ name: ' ' })).errors.name);
  assert.ok(validateSettings(settings({ email: 'not-an-email' })).errors.email);
  assert.ok(
    validateSettings(
      settings({
        name: 'x'.repeat(201),
        defaultNotes: 'x'.repeat(5001),
        website: 'javascript:alert(1)',
      }),
    ).errors.defaultNotes,
  );
  assert.ok(validateSettings(settings({ phone: 234 })).errors.phone);
  assert.ok(validateSettings(settings({ currency: 'USD' })).errors.currency);
  assert.equal(
    validateSettings(settings({ email: 'owner@example.com' })).value.email,
    'owner@example.com',
  );
});

test('website validation accepts HTTP/HTTPS only without credentials or controls', () => {
  for (const input of [
    'https://example.com/path?q=hello',
    'http://example.com',
    'HTTPS://EXAMPLE.COM',
  ])
    assert.ok(safeHttpUrl(input));
  for (const input of [
    'javascript:alert(1)',
    'data:text/html,test',
    '//example.com',
    'https://user:password@example.com',
    'https://example.com\n.evil.test',
    'https://example.com\\@evil.test',
    'ftp://example.com',
    'https://',
    null,
  ])
    assert.equal(safeHttpUrl(input), '');
});

test('settings persist and reset atomically without modifying financial records', () => {
  const { repo, store } = setup();
  const before = repo.getSnapshot().data;
  const result = repo.saveSettings(settings());
  assert.equal(result.ok, true);
  for (const key of ['clients', 'projects', 'invoices', 'payments', 'nextInvoiceNumber'])
    assert.deepEqual(result.snapshot.data[key], before[key]);
  assert.deepEqual(dashboardSummary(result.snapshot.data, today), dashboardSummary(before, today));
  assert.deepEqual(setup(store).repo.getSnapshot().data.settings, result.record);
  const bad = repo.saveSettings(settings({ paymentTermDays: '366' }));
  assert.equal(bad.ok, false);
  assert.deepEqual(repo.getSnapshot().data.settings, result.record);
  assert.deepEqual(repo.reset().data.settings, DEFAULT_SETTINGS);
  assert.deepEqual(JSON.parse(store.getItem(DEMO_STORAGE_KEY)).settings, DEFAULT_SETTINGS);
});

test('defaults fill new invoices only, and issuer snapshots stay frozen after settings changes', () => {
  const { repo } = setup();
  repo.saveSettings(settings());
  const input = invoiceInput(repo);
  assert.equal(input.notes, 'New notes');
  assert.equal(input.paymentInstructions, 'New instructions');
  assert.equal(input.dueDate, '2026-10-16');
  const draft = repo.saveDraft({ ...input, notes: 'Draft override', dueDate: '2026-10-25' }).record;
  repo.saveSettings(
    settings({ name: 'Issuer At Issue', defaultNotes: 'Changed defaults', paymentTermDays: '0' }),
  );
  const beforeIssue = repo.getSnapshot().data;
  assert.deepEqual(
    beforeIssue.invoices.find((record) => record.id === draft.id),
    draft,
  );
  assert.match(
    JSON.stringify(invoicePdfDefinition(beforeIssue, draft.id, today)),
    /Issuer At Issue/,
  );
  const issued = repo.issueInvoice(draft.id);
  assert.equal(issued.ok, true, issued.message);
  assert.equal(issued.record.issuerSnapshot.email, '');
  assert.equal(issued.record.issuerSnapshot.website, 'https://example.com/business');
  const frozen = structuredClone(issued.record);
  repo.saveSettings(settings({ name: 'Later Business', email: 'later@example.com' }));
  assert.deepEqual(
    repo.getSnapshot().data.invoices.find((record) => record.id === draft.id),
    frozen,
  );
  const definition = JSON.stringify(invoicePdfDefinition(repo.getSnapshot().data, draft.id, today));
  assert.match(definition, /Issuer At Issue/);
  assert.doesNotMatch(definition, /Later Business/);
  repo.cancelInvoice(draft.id, 'No longer needed');
  const cancelled = repo.getSnapshot().data.invoices.find((record) => record.id === draft.id);
  repo.saveSettings(settings({ name: 'Another Business' }));
  assert.deepEqual(
    repo.getSnapshot().data.invoices.find((record) => record.id === draft.id),
    cancelled,
  );
  const newValues = invoiceInput(repo);
  assert.equal(newValues.notes, 'New notes');
});

test('old v3 and v2 workspaces receive settings without rewriting saved snapshots or money', () => {
  const old = createDemoData(today);
  delete old.settings;
  old.invoices[0].issuerSnapshot.name = 'Historical issuer';
  const upgraded = migrateDemoData(old);
  assert.ok(upgraded);
  assert.deepEqual(upgraded.settings, DEFAULT_SETTINGS);
  assert.deepEqual(upgraded.invoices, old.invoices);
  assert.deepEqual(upgraded.payments, old.payments);
  const v2 = createLegacyDemoData(today);
  const migrated = migrateDemoData(v2);
  assert.ok(migrated);
  assert.deepEqual(migrated.settings, DEFAULT_SETTINGS);
  assert.equal(dashboardSummary(migrated, today).received, 65000000);
  assert.equal(
    migrateDemoData({
      ...upgraded,
      settings: { ...DEFAULT_SETTINGS, website: 'javascript:alert(1)' },
    }),
    null,
  );
});

test('settings remain isolated and usable with blocked storage; unsupported PDF text fails honestly', () => {
  const { repo } = setup({
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  });
  const saved = repo.saveSettings(settings({ name: 'Unsupported 🚀' }));
  assert.equal(saved.ok, true);
  assert.match(saved.snapshot.notice, /memory only/);
  const draft = repo.saveDraft(invoiceInput(repo)).record;
  assert.throws(
    () => invoicePdfDefinition(repo.getSnapshot().data, draft.id),
    /font cannot display/,
  );
  assert.equal(repo.getSnapshot().data.settings.name, 'Unsupported 🚀');
  assert.deepEqual(setup().repo.getSnapshot().data.settings, DEFAULT_SETTINGS);
  assert.deepEqual(
    issuerFromSettings({ ...DEFAULT_SETTINGS, email: '', phone: '', address: '', website: '' }),
    {
      name: DEFAULT_SETTINGS.name,
      company: DEFAULT_SETTINGS.name,
      contact: '',
      email: '',
      phone: '',
      address: '',
      website: '',
    },
  );
});

test('supplied public sales contacts are separate, safe and encoded', () => {
  assert.equal(MARKETING_CONTACT.email, 'belloabdulwahab266@gmail.com');
  const publicLinks = salesContactLinks();
  assert.equal(new URL(publicLinks.whatsapp).pathname, '/2349070602504');
  assert.deepEqual(salesContactLinks(), publicLinks);
  const links = salesContactLinks({ email: 'sales+demo@example.com', whatsapp: '+2348000000000' });
  assert.equal(decodeURIComponent(links.email.split('?')[0]), 'mailto:sales+demo@example.com');
  assert.equal(new URL(links.whatsapp).hostname, 'wa.me');
  assert.equal(new URL(links.whatsapp).pathname, '/2348000000000');
  assert.equal(new URL(links.whatsapp).searchParams.get('text'), ENQUIRY_TEMPLATE);
  for (const email of [
    'a@example.com?bcc=other@example.com',
    'a@example.com\r\nBcc:other@example.com',
    'javascript:alert(1)',
    'not-email',
  ])
    assert.equal(salesContactLinks({ email }).email, '');
  for (const whatsapp of [
    '08000000000',
    '+234 800 000 0000',
    '+2348000000000?text=bad',
    'https://evil.example',
    '+01234567',
  ])
    assert.equal(salesContactLinks({ whatsapp }).whatsapp, '');
  const { repo } = setup();
  repo.saveSettings(settings({ email: 'visitor@example.com' }));
  assert.deepEqual(salesContactLinks(), publicLinks);
});
