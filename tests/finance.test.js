import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from '../src/data/createDemoData.js';
import {
  dashboardSummary,
  invoiceBalance,
  invoiceStatus,
  invoiceTotal,
} from '../src/services/finance.js';
import { addDays, daysBetween, isDateOnly } from '../src/utils/date.js';
import { formatMoney } from '../src/utils/money.js';

const today = '2026-10-01';
const data = createDemoData(today);

test('dashboard aggregates actual sample payments and remaining balances', () => {
  assert.deepEqual(dashboardSummary(data, today), {
    received: 65000000,
    outstanding: 65000000,
    activeProjects: 3,
    overdue: 1,
    openInvoices: 3,
  });
  assert.equal(
    data.invoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
    130000000,
  );
});

test('partial payments reduce balances and overdue takes precedence', () => {
  const invoice = data.invoices.find((record) => record.id === 'invoice-5');
  assert.equal(invoiceBalance(invoice, data.payments), 15000000);
  assert.equal(invoiceStatus(invoice, data.payments, today), 'partial');
  assert.equal(invoiceStatus(invoice, data.payments, invoice.dueDate), 'partial');
  assert.equal(invoiceStatus(invoice, data.payments, addDays(invoice.dueDate, 1)), 'overdue');
});

test('paid, draft and cancelled invoices never count as overdue or outstanding', () => {
  const paid = data.invoices.find((record) => record.id === 'invoice-1');
  assert.equal(invoiceStatus(paid, data.payments, today), 'paid');
  assert.equal(invoiceBalance(paid, data.payments), 0);
  for (const status of ['draft', 'cancelled']) {
    const invoice = { ...paid, status };
    assert.equal(invoiceStatus(invoice, [], today), status);
    assert.equal(invoiceBalance(invoice, []), 0);
  }
});

test('empty records produce a useful zero summary', () => {
  assert.deepEqual(dashboardSummary({ invoices: [], payments: [], projects: [] }, today), {
    received: 0,
    outstanding: 0,
    activeProjects: 0,
    overdue: 0,
    openInvoices: 0,
  });
});

test('date-only arithmetic handles month, year and leap boundaries', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(isDateOnly('2026-02-30'), false);
  assert.equal(isDateOnly('2026-10-01T00:00:00Z'), false);
});

test('money is calculated in minor units and formatted as NGN', () => {
  assert.equal(
    invoiceTotal({
      items: [
        { quantity: 3, unitAmount: 101 },
        { quantity: 2, unitAmount: 999 },
      ],
    }),
    2301,
  );
  assert.match(formatMoney(12345), /123\.45/);
});
