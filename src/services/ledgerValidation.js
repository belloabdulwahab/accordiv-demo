import { BILLING_LIMITS, PAYMENT_METHODS } from './billingRules.js';
import { invoicePaid, invoiceTotal } from './finance.js';
import { sumMoney } from '../utils/safeMoney.js';
import { isDateOnly } from '../utils/date.js';
import { validEmail } from './recordRules.js';
import { nextInvoiceNumber } from '../data/upgradeBillingData.js';
import { safeHttpUrl } from './settingsRules.js';

const text = (value, max, required = false) =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const timestamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const money = (value) => Number.isSafeInteger(value) && value >= 0;
function snapshotValid(value, issuer = false) {
  return (
    value &&
    typeof value === 'object' &&
    text(value.name, 200, true) &&
    text(value.contact, 200, !issuer) &&
    text(value.company, 200) &&
    text(value.email, 254, !issuer) &&
    ((issuer && value.email === '') || validEmail(value.email)) &&
    (!issuer ||
      value.website === undefined ||
      (text(value.website, 500) && (!value.website || Boolean(safeHttpUrl(value.website))))) &&
    text(value.phone, 50) &&
    text(value.address, 500)
  );
}

// Stored history must satisfy totals, payment limits and snapshots together, not just field types.
export function validateLedger(data) {
  try {
    if (
      !Number.isSafeInteger(data.nextInvoiceNumber) ||
      data.nextInvoiceNumber < nextInvoiceNumber(data.invoices)
    )
      return false;
    if (
      !data.invoices.every((invoice) => {
        if (
          !data.clients.some((client) => client.id === invoice.clientId) ||
          !text(invoice.projectId, 200) ||
          (invoice.projectId && !data.projects.some((project) => project.id === invoice.projectId))
        )
          return false;
        if (
          !['draft', 'issued', 'cancelled'].includes(invoice.status) ||
          invoice.currency !== 'NGN' ||
          !text(invoice.number, 200, invoice.status !== 'draft')
        )
          return false;
        if (
          !isDateOnly(invoice.issuedDate) ||
          !isDateOnly(invoice.dueDate) ||
          invoice.dueDate < invoice.issuedDate
        )
          return false;
        if (
          !Array.isArray(invoice.items) ||
          !invoice.items.length ||
          invoice.items.length > BILLING_LIMITS.items ||
          !invoice.items.every(
            (item) =>
              item &&
              text(item.description, BILLING_LIMITS.description, true) &&
              Number.isSafeInteger(item.quantity) &&
              item.quantity > 0 &&
              item.quantity <= BILLING_LIMITS.quantity &&
              money(item.unitAmount),
          )
        )
          return false;
        if (!invoice.legacy && invoiceTotal(invoice) <= 0) return false;
        if (
          !text(invoice.notes, BILLING_LIMITS.notes) ||
          !text(invoice.paymentInstructions, BILLING_LIMITS.paymentInstructions) ||
          !text(invoice.migrationNote, 1000)
        )
          return false;
        if (
          !timestamp(invoice.createdAt) ||
          !timestamp(invoice.updatedAt) ||
          invoice.updatedAt < invoice.createdAt
        )
          return false;
        if (invoice.status === 'draft')
          return (
            invoice.billingSnapshot === null &&
            invoice.issuerSnapshot === null &&
            invoice.issuedAt === null &&
            invoice.cancelledAt === null &&
            invoice.cancellationReason === ''
          );
        if (
          !snapshotValid(invoice.billingSnapshot) ||
          !snapshotValid(invoice.issuerSnapshot, true) ||
          !timestamp(invoice.issuedAt)
        )
          return false;
        if (invoice.status === 'cancelled')
          return (
            timestamp(invoice.cancelledAt) &&
            text(invoice.cancellationReason, BILLING_LIMITS.reason, true)
          );
        return invoice.cancelledAt === null && invoice.cancellationReason === '';
      })
    )
      return false;
    if (
      !data.payments.every((payment) => {
        const invoice = data.invoices.find((item) => item.id === payment.invoiceId);
        if (
          !invoice ||
          invoice.status === 'draft' ||
          !money(payment.amount) ||
          !payment.amount ||
          !isDateOnly(payment.date) ||
          !timestamp(payment.createdAt)
        )
          return false;
        if (
          !Object.hasOwn(PAYMENT_METHODS, payment.method) ||
          !text(payment.reference, BILLING_LIMITS.reference) ||
          !text(payment.notes, BILLING_LIMITS.paymentNotes) ||
          !text(payment.submissionId, 200, true)
        )
          return false;
        if (payment.status === 'active')
          return (
            invoice.status === 'issued' && payment.voidedAt === null && payment.voidReason === ''
          );
        return (
          payment.status === 'voided' &&
          timestamp(payment.voidedAt) &&
          text(payment.voidReason, BILLING_LIMITS.reason, true)
        );
      })
    )
      return false;
    if (new Set(data.payments.map((payment) => payment.submissionId)).size !== data.payments.length)
      return false;
    if (
      !data.invoices.every(
        (invoice) => invoicePaid(invoice, data.payments) <= invoiceTotal(invoice),
      )
    )
      return false;
    // Any dashboard or filtered subtotal must remain safe, including retained history.
    sumMoney(data.invoices.map(invoiceTotal));
    sumMoney(data.payments.map((payment) => payment.amount));
    return true;
  } catch {
    return false;
  }
}
