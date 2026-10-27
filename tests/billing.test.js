import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from '../src/data/createDemoData.js';
import { createLegacyDemoData } from './fixtures/legacyDemoData.js';
import {
  createDemoRepository,
  DEMO_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
} from '../src/services/demoRepository.js';
import { migrateDemoData } from '../src/services/demoMigration.js';
import { isValidDemoData } from '../src/services/demoValidation.js';
import { invoiceFormValues, parseInvoiceItems } from '../src/services/billingRules.js';
import {
  dashboardSummary,
  invoiceBalance,
  invoicePaid,
  invoiceStatus,
  invoiceStatusText,
  invoiceTotal,
} from '../src/services/finance.js';
import { lineTotal, sumMoney } from '../src/utils/safeMoney.js';
import { moneyInputValue } from '../src/utils/money.js';
import { invoicePdfDefinition, pdfMoney, safeInvoiceFilename } from '../src/services/invoicePdf.js';

const today = '2026-10-02';
const now = '2026-10-02T10:30:00.000Z';
function storage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}
function setup(store = storage(), seed = () => createDemoData(today)) {
  let n = 0;
  return {
    store,
    repo: createDemoRepository(() => store, seed, {
      now: () => now,
      today: () => today,
      makeId: () => `billing-${++n}`,
    }),
  };
}
const input = (patch = {}) => ({
  clientId: 'client-1',
  projectId: 'project-1',
  issuedDate: today,
  dueDate: today,
  notes: 'A sample note',
  paymentInstructions: 'Fictional instructions only',
  items: [{ description: 'Design service', quantity: '3', unitPrice: '10.01' }],
  ...patch,
});
const payment = (amount, patch = {}) => ({
  amount,
  date: today,
  method: 'cash',
  reference: 'EXAMPLE',
  notes: 'Received earlier',
  ...patch,
});
function issued(repo, patch = {}) {
  const draft = repo.saveDraft(input(patch));
  assert.equal(draft.ok, true, draft.message);
  const result = repo.issueInvoice(draft.record.id);
  assert.equal(result.ok, true, result.message);
  return result.record;
}

test('exact invoice arithmetic rejects unsafe conversion, multiplication and addition', () => {
  assert.equal(
    invoiceTotal({
      items: [
        { quantity: 3, unitAmount: 1001 },
        { quantity: 2, unitAmount: 11 },
      ],
    }),
    3025,
  );
  assert.equal(
    lineTotal({ quantity: 1, unitAmount: Number.MAX_SAFE_INTEGER }),
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(() => lineTotal({ quantity: 2, unitAmount: Number.MAX_SAFE_INTEGER }));
  assert.throws(() => sumMoney([Number.MAX_SAFE_INTEGER, 1]));
  for (const value of ['0.001', '-1', '1e3', '90,000', '90071992547409.92'])
    assert.ok(
      Object.keys(
        parseInvoiceItems([{ description: 'Fee', quantity: '1', unitPrice: value }]).errors,
      ).length,
    );
  for (const quantity of ['0', '-1', '1.5', '10001', '1e2'])
    assert.ok(
      parseInvoiceItems([{ description: 'Fee', quantity, unitPrice: '1' }]).errors[
        'item-0-quantity'
      ],
    );
  assert.ok(parseInvoiceItems([]).errors.items);
  assert.ok(
    parseInvoiceItems([{ description: 'Free', quantity: '1', unitPrice: '0' }]).errors.items,
  );
});

test('draft editing, issue lock, confirmation outcome, numbering and cancellation preserve history', () => {
  const { repo } = setup();
  const before = dashboardSummary(repo.getSnapshot().data, today);
  let draft = repo.saveDraft(input()).record;
  assert.equal(draft.number, '');
  assert.equal(draft.issuedAt, null);
  assert.deepEqual(dashboardSummary(repo.getSnapshot().data, today), before);
  draft = repo.saveDraft(input({ notes: 'Edited draft' }), draft.id).record;
  assert.equal(draft.notes, 'Edited draft');
  const invoice = repo.issueInvoice(draft.id).record;
  assert.equal(invoice.number, 'INV-007');
  assert.equal(invoice.issuedAt, now);
  assert.equal(repo.issueInvoice(invoice.id).ok, false);
  assert.equal(repo.saveDraft(input(), invoice.id).ok, false);
  assert.equal(repo.cancelInvoice(invoice.id, ' ').ok, false);
  const cancelled = repo.cancelInvoice(invoice.id, 'Created in error').record;
  assert.equal(cancelled.cancelledAt, now);
  assert.equal(cancelled.number, invoice.number);
  assert.equal(repo.recordPayment(invoice.id, payment('1'), 'cancelled-payment').ok, false);
  assert.equal(issued(repo).number, 'INV-008');
  const copy = repo.duplicateInvoice(cancelled.id).record;
  assert.equal(copy.number, '');
  assert.equal(copy.status, 'draft');
  assert.equal(copy.billingSnapshot, null);
  assert.equal(invoicePaid(copy, repo.getSnapshot().data.payments), 0);
  assert.notEqual(copy.id, cancelled.id);
});

test('new associations require eligible records, retained history and billing snapshots survive edits', () => {
  const { repo } = setup();
  assert.equal(repo.saveDraft(input({ projectId: 'project-2' })).ok, false);
  assert.equal(repo.saveDraft(input({ dueDate: '2026-10-01' })).ok, false);
  assert.equal(repo.saveDraft(input({ dueDate: '2026-02-30' })).ok, false);
  const draft = repo.saveDraft(input()).record;
  repo.setClientArchived('client-1', true);
  repo.setProjectArchived('project-1', true);
  assert.equal(repo.saveDraft(input()).ok, false);
  assert.equal(repo.saveDraft(input(), draft.id).ok, true);
  const invoice = repo.issueInvoice(draft.id).record;
  assert.equal(repo.duplicateInvoice(invoice.id).ok, false);
  const client = repo.getSnapshot().data.clients[0];
  assert.equal(repo.saveClient({ ...client, company: 'Changed company' }, client.id).ok, true);
  const project = repo.getSnapshot().data.projects[0];
  assert.equal(
    repo.saveProject({ ...project, clientId: 'client-2', fee: '999.99' }, project.id).ok,
    true,
  );
  const current = repo.getSnapshot().data.invoices.find((item) => item.id === invoice.id);
  assert.deepEqual(current.billingSnapshot, invoice.billingSnapshot);
  assert.deepEqual(current.items, invoice.items);
  assert.equal(current.clientId, 'client-1');
  assert.equal(current.projectId, 'project-1');
  repo.setClientArchived('client-1', false);
  const copy = repo.duplicateInvoice(invoice.id).record;
  assert.equal(copy.projectId, '');
});

test('partial/full payments, duplicate submission, overpayment and voiding recalculate the dashboard', () => {
  const { repo } = setup();
  const invoice = issued(repo);
  const initial = dashboardSummary(repo.getSnapshot().data, today);
  const partial = repo.recordPayment(invoice.id, payment('10.01'), 'once');
  assert.equal(partial.ok, true);
  assert.equal(partial.record.amount, 1001);
  assert.equal(invoiceBalance(invoice, partial.snapshot.data.payments), 2002);
  assert.equal(invoiceStatus(invoice, partial.snapshot.data.payments, today), 'partial');
  assert.equal(
    invoiceStatusText(invoice, partial.snapshot.data.payments, '2026-10-03'),
    'Overdue · Partially paid',
  );
  assert.equal(repo.recordPayment(invoice.id, payment('10.01'), 'once').ok, false);
  assert.equal(repo.recordPayment(invoice.id, payment('20.03'), 'over').ok, false);
  assert.equal(repo.cancelInvoice(invoice.id, 'No longer needed').ok, false);
  const rest = repo.recordPayment(
    invoice.id,
    payment('20.02', { method: 'bank_transfer' }),
    'remaining',
  );
  assert.equal(rest.ok, true);
  assert.equal(invoiceStatus(invoice, rest.snapshot.data.payments, '2026-10-10'), 'paid');
  assert.equal(repo.voidPayment(rest.record.id, '').ok, false);
  const voided = repo.voidPayment(rest.record.id, 'Mistaken amount');
  assert.equal(voided.record.amount, 2002);
  assert.equal(voided.record.status, 'voided');
  assert.equal(voided.record.voidedAt, now);
  assert.equal(voided.record.voidReason, 'Mistaken amount');
  assert.equal(invoiceBalance(invoice, voided.snapshot.data.payments), 2002);
  const summary = dashboardSummary(voided.snapshot.data, today);
  assert.equal(summary.received, initial.received + 1001);
  assert.equal(summary.outstanding, initial.outstanding - 1001);
  assert.equal(repo.voidPayment(rest.record.id, 'Again').ok, false);
  assert.equal(repo.cancelInvoice(invoice.id, 'Still active').ok, false);
  repo.voidPayment(partial.record.id, 'Duplicate record');
  assert.equal(repo.cancelInvoice(invoice.id, 'All mistaken payments voided').ok, true);
  assert.equal(
    repo.getSnapshot().data.payments.filter((record) => record.invoiceId === invoice.id).length,
    2,
  );
});

test('payments reject zero, negatives, future dates, invalid methods and excluded states', () => {
  const { repo } = setup();
  const draft = repo.saveDraft(input()).record;
  assert.equal(repo.recordPayment(draft.id, payment('1'), 'draft').ok, false);
  const invoice = repo.issueInvoice(draft.id).record;
  for (const values of [
    payment('0'),
    payment('-1'),
    payment('1.001'),
    payment('1', { date: '2026-10-03' }),
    payment('1', { date: '2026-02-30' }),
    payment('1', { method: 'unknown' }),
  ])
    assert.equal(repo.recordPayment(invoice.id, values, JSON.stringify(values)).ok, false);
  assert.equal(invoiceStatus(invoice, [], today), 'unpaid');
  assert.equal(invoiceStatus(invoice, [], '2026-10-03'), 'overdue');
});

test('financial workspace limit is atomic and maximum kobo remains exact', () => {
  const empty = () => ({
    ...createDemoData(today),
    invoices: [],
    payments: [],
    nextInvoiceNumber: 1,
  });
  const { repo } = setup(storage(), empty);
  const maxInput = input({
    items: [
      {
        description: 'Numeric boundary',
        quantity: '1',
        unitPrice: moneyInputValue(Number.MAX_SAFE_INTEGER),
      },
    ],
  });
  const invoice = repo.saveDraft(maxInput).record;
  assert.equal(invoiceTotal(invoice), Number.MAX_SAFE_INTEGER);
  const before = repo.getSnapshot().data;
  assert.equal(repo.saveDraft(input()).ok, false);
  assert.deepEqual(repo.getSnapshot().data, before);
  assert.equal(repo.issueInvoice(invoice.id).ok, true);
  assert.equal(
    repo.recordPayment(invoice.id, payment(maxInput.items[0].unitPrice), 'max').ok,
    true,
  );
  assert.equal(dashboardSummary(repo.getSnapshot().data, today).received, Number.MAX_SAFE_INTEGER);
});

test('v2 and opening-balance migration preserve identifiers, exact totals, numbers and settlement', () => {
  for (const opening of [false, true]) {
    const old = createLegacyDemoData(today);
    if (opening)
      for (const invoice of old.invoices) {
        invoice.totalAmount = invoiceTotal(invoice);
        delete invoice.items;
      }
    old.invoices[0].number = 'OLD-0099';
    delete old.clients[0].phone;
    delete old.invoices[0].notes;
    const migrated = migrateDemoData(old);
    assert.ok(migrated);
    assert.equal(migrated.nextInvoiceNumber, 100);
    assert.deepEqual(
      migrated.invoices.map((invoice) => invoice.id),
      old.invoices.map((invoice) => invoice.id),
    );
    for (let index = 0; index < old.invoices.length; index++) {
      assert.equal(
        invoiceTotal(migrated.invoices[index]),
        opening ? old.invoices[index].totalAmount : invoiceTotal(old.invoices[index]),
      );
      assert.equal(migrated.invoices[index].number, old.invoices[index].number);
    }
    assert.deepEqual(
      migrated.payments.map(({ id, invoiceId, amount, date }) => ({ id, invoiceId, amount, date })),
      old.payments,
    );
    assert.equal(dashboardSummary(migrated, today).received, 65000000);
    assert.equal(dashboardSummary(migrated, today).outstanding, 65000000);
    if (opening) assert.match(migrated.invoices[0].items[0].description, /Opening balance/);
    assert.match(migrated.invoices[0].migrationNote, /reconstructed/);
    const store = storage();
    store.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(old));
    const { repo } = setup(store);
    assert.equal(repo.getSnapshot().data.version, 3);
    assert.equal(store.getItem(PREVIOUS_STORAGE_KEY), null);
    assert.ok(store.getItem(DEMO_STORAGE_KEY));
  }
});

test('legacy zero invoices, preassigned draft numbers and exhausted counters preserve history safely', () => {
  const old = createLegacyDemoData(today);
  old.invoices[0].items[0].unitAmount = 0;
  old.invoices[0].status = 'draft';
  old.invoices[0].number = 'INV-020';
  let migrated = migrateDemoData(old);
  assert.ok(migrated);
  const { repo } = setup(storage(), () => migrated);
  assert.equal(repo.issueInvoice(old.invoices[0].id).ok, false);
  repo.saveDraft(input(), old.invoices[0].id);
  assert.equal(repo.issueInvoice(old.invoices[0].id).record.number, 'INV-020');
  assert.equal(issued(repo).number, 'INV-021');
  migrated = migrateDemoData({
    ...old,
    invoices: old.invoices.map((invoice, index) =>
      index === 1 ? { ...invoice, number: 'INV-900719925474099100' } : invoice,
    ),
  });
  assert.ok(migrated);
  const exhausted = setup(storage(), () => migrated).repo;
  const draft = exhausted.saveDraft(input()).record;
  assert.equal(exhausted.issueInvoice(draft.id).ok, false);
  assert.equal(
    exhausted.getSnapshot().data.invoices.find((invoice) => invoice.id === draft.id).number,
    '',
  );
});

test('optional fields recover; invalid money, references and payment history are rejected', () => {
  const good = createDemoData(today);
  delete good.invoices[0].notes;
  delete good.invoices[0].projectId;
  delete good.invoices[0].cancellationReason;
  delete good.invoices[0].billingSnapshot.phone;
  delete good.invoices[0].issuerSnapshot.address;
  delete good.payments[0].reference;
  delete good.payments[0].voidReason;
  assert.ok(migrateDemoData(good));
  for (const corrupt of [
    (data) => {
      data.invoices[0].items[0].unitAmount = 0.01;
    },
    (data) => {
      data.payments[0].invoiceId = 'missing';
    },
    (data) => {
      data.payments[0].amount = Number.MAX_SAFE_INTEGER;
    },
    (data) => {
      data.payments[0].status = 'deleted';
    },
  ]) {
    const data = createDemoData(today);
    corrupt(data);
    assert.equal(isValidDemoData(data), false);
  }
});

test('invoice/payment mutations persist, remain isolated, reset coherently and survive storage failure', () => {
  const { repo, store } = setup();
  const invoice = issued(repo);
  const paid = repo.recordPayment(invoice.id, payment('1'), 'persist');
  repo.voidPayment(paid.record.id, 'Mistaken entry');
  assert.deepEqual(setup(store).repo.getSnapshot().data, repo.getSnapshot().data);
  assert.equal(
    setup()
      .repo.getSnapshot()
      .data.invoices.some((record) => record.id === invoice.id),
    false,
  );
  const before = repo.getSnapshot().data;
  before.invoices[0].number = 'Tampered';
  assert.notEqual(repo.getSnapshot().data.invoices[0].number, 'Tampered');
  store.setItem = () => {
    throw new Error('Storage blocked');
  };
  const another = repo.saveDraft(input());
  assert.equal(another.ok, true);
  assert.match(another.snapshot.notice, /memory only/);
  assert.equal(repo.reset().data.invoices.length, 6);
  assert.equal(repo.issueInvoice(invoice.id).ok, false);
});

test('PDF definition uses snapshots, inert text, current settlement, repeated labels and safe filenames', () => {
  const { repo } = setup();
  const invoice = issued(repo, {
    notes: '<script>alert(1)</script> https://example.com',
    items: [
      { description: 'Long unbroken ' + 'X'.repeat(1000), quantity: '1', unitPrice: '123.45' },
    ],
  });
  repo.recordPayment(invoice.id, payment('23.45'), 'pdf');
  const data = repo.getSnapshot().data;
  data.clients[0].name = 'Changed client';
  const definition = invoicePdfDefinition(data, invoice.id, today, new Date(now));
  const serialized = JSON.stringify(definition);
  assert.match(serialized, /Bloom Studio/);
  assert.doesNotMatch(serialized, /Changed client/);
  assert.match(serialized, /NGN 100.00/);
  assert.match(serialized, /<script>/);
  assert.doesNotMatch(serialized, /"link":/);
  assert.match(definition.header.text, /DEMO — Sample document/);
  assert.match(definition.footer(2, 3).text, /Page 2 of 3/);
  assert.equal(pdfMoney(Number.MAX_SAFE_INTEGER), 'NGN 90,071,992,547,409.91');
  assert.equal(
    safeInvoiceFilename({ number: '../../evil.exe', id: 'x' }),
    'Accordiv-evil-exe-demo.pdf',
  );
  const copy = repo.duplicateInvoice(invoice.id).record;
  assert.match(invoicePdfDefinition(repo.getSnapshot().data, copy.id).header.text, /DRAFT/);
  const another = issued(repo);
  repo.cancelInvoice(another.id, 'No longer needed');
  assert.match(invoicePdfDefinition(repo.getSnapshot().data, another.id).header.text, /CANCELLED/);
  data.invoices.find((item) => item.id === invoice.id).notes = 'Unsupported 🚀';
  assert.throws(() => invoicePdfDefinition(data, invoice.id), /font cannot display/);
  assert.equal(invoiceFormValues(invoice).items[0].unitPrice, '123.45');
});
