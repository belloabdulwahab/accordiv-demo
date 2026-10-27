import { DEMO_ISSUER } from '../config/demoBusiness.js';
import { DEFAULT_SETTINGS } from '../services/settingsRules.js';
import { billingSnapshot } from '../services/billingRules.js';

export function nextInvoiceNumber(invoices) {
  let highest = 0n;
  for (const invoice of invoices) {
    const match = invoice.number?.match(/(\d+)$/);
    if (match) {
      const value = BigInt(match[1]);
      if (value > highest) highest = value;
    }
  }
  // At the safe limit, preserve records but refuse any further issuance.
  return Number(
    highest >= BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : highest + 1n,
  );
}

// Old records have no issue-time snapshots; reconstruct them once from the available saved details.
export function upgradeBillingData(data) {
  const invoices = data.invoices.map((invoice) => {
    const status = invoice.status === 'sent' ? 'issued' : invoice.status;
    const timestamp = `${invoice.issuedDate}T00:00:00.000Z`;
    return {
      ...invoice,
      status,
      currency: 'NGN',
      projectId: invoice.projectId || '',
      notes: invoice.notes ?? '',
      paymentInstructions: invoice.paymentInstructions ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
      issuedAt: status === 'draft' ? null : timestamp,
      cancelledAt: status === 'cancelled' ? timestamp : null,
      cancellationReason:
        status === 'cancelled'
          ? 'Migrated legacy cancellation; original reason was not recorded.'
          : '',
      billingSnapshot:
        status === 'draft'
          ? null
          : billingSnapshot(data.clients.find((client) => client.id === invoice.clientId)),
      issuerSnapshot: status === 'draft' ? null : { ...DEMO_ISSUER },
      legacy: true,
      migrationNote:
        status === 'draft'
          ? ''
          : 'Historical billing details were reconstructed from the client record available at migration. Original issuance details and event times were not recorded.',
    };
  });
  return {
    ...data,
    version: 3,
    settings: { ...DEFAULT_SETTINGS },
    nextInvoiceNumber: nextInvoiceNumber(invoices),
    invoices,
    payments: data.payments.map((payment) => ({
      ...payment,
      status: 'active',
      method: 'other',
      reference: '',
      notes: 'Imported historical payment; its original method was not recorded.',
      createdAt: `${payment.date}T00:00:00.000Z`,
      voidedAt: null,
      voidReason: '',
      submissionId: `legacy-${payment.id}`,
    })),
  };
}
