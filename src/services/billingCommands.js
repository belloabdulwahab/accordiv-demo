import { issuerFromSettings } from './settingsRules.js';
import {
  billingSnapshot,
  invoiceFormValues,
  validateInvoiceInput,
  validatePaymentInput,
  validateReason,
} from './billingRules.js';
import { invoiceBalance, invoicePaid } from './finance.js';
import { addDays } from '../utils/date.js';

const failure = (message, errors = {}) => ({ ok: false, message, errors });
const isInput = (input) => input && typeof input === 'object' && !Array.isArray(input);

/**
 * Demo billing actions read copies and use a validating commit callback.
 * A failed command leaves repository state unchanged; owner writes use the PHP API instead.
 */
export function createBillingCommands({ read, commit, now, today, makeId }) {
  function newId(prefix, records) {
    for (let count = 0; count < 5; count++) {
      const id = `${prefix}-${makeId()}`;
      if (!records.some((record) => record.id === id)) return id;
    }
    throw new Error('A unique record ID could not be created. Please try again.');
  }

  function saveDraft(input, id) {
    const data = read();
    if (!isInput(input)) return failure('Enter valid invoice details.');
    const existing =
      id === undefined ? undefined : data.invoices.find((invoice) => invoice.id === id);
    if (id !== undefined && !existing)
      return failure('Invoice not found. It may have been removed by Reset Demo.');
    if (existing && existing.status !== 'draft')
      return failure(
        'Issued and cancelled invoices are locked. Duplicate the invoice to create a new draft.',
      );
    const { value, errors } = validateInvoiceInput(input, data, existing);
    if (Object.keys(errors).length) return failure('Please check the highlighted fields.', errors);
    const timestamp = now();
    const record = {
      ...existing,
      ...value,
      id: existing?.id || newId('invoice', data.invoices),
      status: 'draft',
      currency: 'NGN',
      number: existing?.number || '',
      createdAt: existing?.createdAt || timestamp,
      updatedAt: [timestamp, existing?.updatedAt || timestamp].sort().at(-1),
      issuedAt: null,
      cancelledAt: null,
      cancellationReason: '',
      billingSnapshot: null,
      issuerSnapshot: null,
      legacy: false,
      migrationNote: '',
    };
    data.invoices = existing
      ? data.invoices.map((invoice) => (invoice.id === id ? record : invoice))
      : [...data.invoices, record];
    return commit(data, record);
  }

  function issueInvoice(id) {
    const data = read();
    const invoice = data.invoices.find((record) => record.id === id);
    if (!invoice) return failure('Invoice not found.');
    if (invoice.status !== 'draft') return failure('Only a draft can be issued.');
    const { errors } = validateInvoiceInput(invoiceFormValues(invoice), data, invoice);
    if (Object.keys(errors).length)
      return failure('Edit this draft and resolve its validation errors before issuing.', errors);
    let number = invoice.number;
    const used = new Set(
      data.invoices
        .filter((record) => record.id !== id)
        .map((record) => record.number.toUpperCase()),
    );
    if (number && used.has(number.toUpperCase()))
      return failure(
        'This historical number is already used. Duplicate this invoice to get a new draft and number.',
      );
    if (!number) {
      do {
        if (data.nextInvoiceNumber >= Number.MAX_SAFE_INTEGER)
          return failure('Demo invoice numbering is exhausted. No number was assigned.');
        number = `INV-${String(data.nextInvoiceNumber).padStart(3, '0')}`;
        data.nextInvoiceNumber += 1;
      } while (used.has(number.toUpperCase()));
    }
    // Freeze both identities at issuance so later client/settings edits cannot rewrite this invoice.
    const timestamp = now();
    Object.assign(invoice, {
      number,
      status: 'issued',
      issuedAt: timestamp,
      updatedAt: [timestamp, invoice.updatedAt].sort().at(-1),
      billingSnapshot: billingSnapshot(
        data.clients.find((client) => client.id === invoice.clientId),
      ),
      issuerSnapshot: issuerFromSettings(data.settings),
      legacy: false,
    });
    return commit(data, invoice);
  }

  function cancelInvoice(id, reason) {
    const data = read();
    const invoice = data.invoices.find((record) => record.id === id);
    if (!invoice || invoice.status !== 'issued')
      return failure('Only an issued invoice can be cancelled.');
    if (invoicePaid(invoice, data.payments) > 0)
      return failure(
        'This invoice has active payments. It cannot be cancelled while those payments remain active.',
      );
    const error = validateReason(reason);
    if (error) return failure(error, { reason: error });
    const timestamp = now();
    Object.assign(invoice, {
      status: 'cancelled',
      cancelledAt: timestamp,
      cancellationReason: reason.trim(),
      updatedAt: [timestamp, invoice.updatedAt].sort().at(-1),
    });
    return commit(data, invoice);
  }

  function duplicateInvoice(id) {
    const data = read();
    const source = data.invoices.find((invoice) => invoice.id === id);
    if (!source) return failure('Invoice not found.');
    if (data.clients.find((client) => client.id === source.clientId)?.archived)
      return failure(
        'Restore this client before duplicating, or create a new draft for an active client.',
      );
    const project = data.projects.find((record) => record.id === source.projectId);
    return saveDraft({
      ...invoiceFormValues(source),
      projectId:
        project &&
        project.clientId === source.clientId &&
        !project.archived &&
        project.status !== 'cancelled'
          ? project.id
          : '',
      issuedDate: today(),
      dueDate: addDays(today(), data.settings.paymentTermDays),
    });
  }

  // This records money already received; the submission ID prevents duplicate demo entries.
  function recordPayment(invoiceId, input, submissionId) {
    const data = read();
    const invoice = data.invoices.find((record) => record.id === invoiceId);
    if (!invoice || invoice.status !== 'issued')
      return failure('Payments can only be recorded against an issued invoice.');
    if (!isInput(input)) return failure('Enter valid payment details.');
    if (typeof submissionId !== 'string' || !submissionId || submissionId.length > 200)
      return failure('A valid payment submission ID is required. Reopen the payment form.');
    if (data.payments.some((payment) => payment.submissionId === submissionId))
      return failure(
        'This payment submission has already been recorded. Check payment history before recording another.',
      );
    const { value, errors } = validatePaymentInput(input, today());
    if (value.amount > invoiceBalance(invoice, data.payments))
      errors.amount = 'The amount exceeds the current outstanding balance.';
    if (Object.keys(errors).length) return failure('Please check the highlighted fields.', errors);
    const payment = {
      ...value,
      id: newId('payment', data.payments),
      invoiceId,
      submissionId,
      status: 'active',
      createdAt: now(),
      voidedAt: null,
      voidReason: '',
    };
    data.payments.push(payment);
    return commit(data, payment);
  }

  // Voiding corrects settlement while retaining the original payment and its reason; no refund is sent.
  function voidPayment(id, reason) {
    const data = read();
    const payment = data.payments.find((record) => record.id === id);
    if (!payment || payment.status !== 'active')
      return failure('Only an active payment record can be voided.');
    const error = validateReason(reason);
    if (error) return failure(error, { reason: error });
    Object.assign(payment, { status: 'voided', voidedAt: now(), voidReason: reason.trim() });
    return commit(data, payment);
  }
  return { saveDraft, issueInvoice, cancelInvoice, duplicateInvoice, recordPayment, voidPayment };
}
