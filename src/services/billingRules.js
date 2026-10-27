import { isDateOnly } from '../utils/date.js';
import { moneyInputValue, parseMoneyInput } from '../utils/money.js';
import { lineTotal } from '../utils/safeMoney.js';
import { invoiceTotal } from './finance.js';

export const PAYMENT_METHODS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};
export const BILLING_LIMITS = {
  description: 2000,
  notes: 5000,
  paymentInstructions: 5000,
  reference: 200,
  paymentNotes: 3000,
  reason: 1000,
  items: 100,
  quantity: 10000,
};
export const billingSnapshot = (client) =>
  Object.fromEntries(
    ['name', 'company', 'contact', 'email', 'phone', 'address'].map((key) => [
      key,
      client[key] || '',
    ]),
  );
export const invoiceBilling = (invoice, clients) =>
  invoice.billingSnapshot ||
  billingSnapshot(clients.find((client) => client.id === invoice.clientId));
export const eligibleProject = (project, clientId) =>
  project.clientId === clientId && !project.archived && project.status !== 'cancelled';

export function invoiceFormValues(invoice) {
  return {
    clientId: invoice.clientId,
    projectId: invoice.projectId || '',
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes || '',
    paymentInstructions: invoice.paymentInstructions || '',
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: moneyInputValue(item.unitAmount),
    })),
  };
}

function text(input, key, limit, errors, required = false) {
  if (input[key] !== undefined && typeof input[key] !== 'string') {
    errors[key] = 'Enter text for this field.';
    return '';
  }
  const value = (input[key] || '').trim();
  if (required && !value) errors[key] = 'This field is required.';
  else if (value.length > limit) errors[key] = `Use ${limit} characters or fewer.`;
  return value;
}

export function parseInvoiceItems(items) {
  const errors = {};
  if (!Array.isArray(items) || !items.length || items.length > BILLING_LIMITS.items)
    return { items: [], errors: { items: 'Use between 1 and 100 line items.' } };
  const parsed = items.map((item, index) => {
    const row = {};
    if (!item || typeof item !== 'object') {
      errors[`item-${index}-description`] = 'Enter a valid line item.';
      return row;
    }
    const descriptionErrors = {};
    row.description = text(
      item,
      'description',
      BILLING_LIMITS.description,
      descriptionErrors,
      true,
    );
    if (descriptionErrors.description)
      errors[`item-${index}-description`] = descriptionErrors.description;
    if (
      typeof item.quantity !== 'string' ||
      !/^\d{1,5}$/.test(item.quantity.trim()) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > BILLING_LIMITS.quantity
    )
      errors[`item-${index}-quantity`] = 'Use a whole number from 1 to 10,000.';
    else row.quantity = Number(item.quantity.trim());
    try {
      row.unitAmount = parseMoneyInput(item.unitPrice);
    } catch (error) {
      errors[`item-${index}-unitPrice`] = error.message;
    }
    if (row.quantity && row.unitAmount !== undefined) {
      try {
        lineTotal(row);
      } catch (error) {
        errors[`item-${index}-unitPrice`] = error.message;
      }
    }
    return row;
  });
  if (!Object.keys(errors).length) {
    try {
      if (invoiceTotal({ items: parsed }) <= 0)
        errors.items = 'The invoice total must be greater than zero.';
    } catch (error) {
      errors.items = error.message;
    }
  }
  return { items: parsed, errors };
}

export function validateInvoiceInput(input, data, existing) {
  const errors = {};
  const value = {
    clientId: text(input, 'clientId', 200, errors, true),
    projectId: text(input, 'projectId', 200, errors),
    issuedDate: text(input, 'issuedDate', 10, errors, true),
    dueDate: text(input, 'dueDate', 10, errors, true),
    notes: text(input, 'notes', BILLING_LIMITS.notes, errors),
    paymentInstructions: text(
      input,
      'paymentInstructions',
      BILLING_LIMITS.paymentInstructions,
      errors,
    ),
  };
  const client = data.clients.find((record) => record.id === value.clientId);
  if (!client || (client.archived && existing?.clientId !== client.id))
    errors.clientId = 'Choose an active client for a new invoice or a changed client relationship.';
  if (value.projectId) {
    const project = data.projects.find((record) => record.id === value.projectId);
    const retained =
      existing?.clientId === value.clientId && existing?.projectId === value.projectId;
    if (!project || (!retained && !eligibleProject(project, value.clientId)))
      errors.projectId = 'Choose a non-archived, non-cancelled project belonging to this client.';
  }
  for (const field of ['issuedDate', 'dueDate'])
    if (!isDateOnly(value[field])) errors[field] = 'Enter a valid calendar date.';
  if (!errors.issuedDate && !errors.dueDate && value.dueDate < value.issuedDate)
    errors.dueDate = 'The due date must be on or after the issue date.';
  const parsed = parseInvoiceItems(input.items);
  value.items = parsed.items;
  return { value, errors: { ...errors, ...parsed.errors } };
}

export function validatePaymentInput(input, today) {
  const errors = {};
  const value = {
    date: text(input, 'date', 10, errors, true),
    method: text(input, 'method', 30, errors, true),
    reference: text(input, 'reference', BILLING_LIMITS.reference, errors),
    notes: text(input, 'notes', BILLING_LIMITS.paymentNotes, errors),
  };
  try {
    value.amount = parseMoneyInput(input.amount);
    if (!value.amount) errors.amount = 'Enter an amount greater than zero.';
  } catch (error) {
    errors.amount = error.message;
  }
  if (!isDateOnly(value.date)) errors.date = 'Enter a valid payment date.';
  else if (value.date > today) errors.date = 'Payment date cannot be in the future.';
  if (!Object.hasOwn(PAYMENT_METHODS, value.method)) errors.method = 'Choose a payment method.';
  return { value, errors };
}

export function validateReason(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > BILLING_LIMITS.reason)
    return 'Enter a reason of 1 to 1,000 characters.';
  return '';
}
