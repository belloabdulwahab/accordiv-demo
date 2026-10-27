import { isActiveProject } from './recordRules.js';
import { lineTotal, sumMoney } from '../utils/safeMoney.js';

export function invoiceTotal(invoice) {
  return sumMoney(invoice.items.map(lineTotal));
}

// Voided payments remain in history but no longer settle an invoice.
export function invoicePaid(invoice, payments) {
  return sumMoney(
    activePayments(payments)
      .filter((payment) => payment.invoiceId === invoice.id)
      .map((payment) => payment.amount),
  );
}

export const activePayments = (payments) =>
  payments.filter((payment) => payment.status !== 'voided');
export const receivedTotal = (payments) =>
  sumMoney(activePayments(payments).map((payment) => payment.amount));

/** Remaining collectible kobo. Drafts and cancellations do not enter receivables. */
export function invoiceBalance(invoice, payments) {
  if (['draft', 'cancelled'].includes(invoice.status)) return 0;
  return Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice, payments));
}

// Resolve paid before overdue: a past due date alone does not create a debt.
export function invoiceStatus(invoice, payments, today) {
  if (['draft', 'cancelled'].includes(invoice.status)) return invoice.status;
  if (invoiceBalance(invoice, payments) === 0) return 'paid';
  if (invoice.dueDate < today) return 'overdue';
  return invoicePaid(invoice, payments) > 0 ? 'partial' : 'unpaid';
}

export function invoiceHasPartialPayment(invoice, payments) {
  return (
    invoice.status === 'issued' &&
    invoicePaid(invoice, payments) > 0 &&
    invoiceBalance(invoice, payments) > 0
  );
}

export const INVOICE_STATUS_LABELS = {
  draft: 'Draft',
  unpaid: 'Unpaid',
  partial: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};
export function invoiceStatusText(invoice, payments, today) {
  const status = invoiceStatus(invoice, payments, today);
  return `${INVOICE_STATUS_LABELS[status]}${status === 'overdue' && invoiceHasPartialPayment(invoice, payments) ? ' · Partially paid' : ''}`;
}

// Cash received comes from payment records, not invoice totals or planning fees.
export function dashboardSummary(data, today) {
  return {
    received: receivedTotal(data.payments),
    outstanding: sumMoney(data.invoices.map((invoice) => invoiceBalance(invoice, data.payments))),
    activeProjects: data.projects.filter(isActiveProject).length,
    overdue: data.invoices.filter(
      (invoice) => invoiceStatus(invoice, data.payments, today) === 'overdue',
    ).length,
    openInvoices: data.invoices.filter((invoice) => invoiceBalance(invoice, data.payments) > 0)
      .length,
  };
}
