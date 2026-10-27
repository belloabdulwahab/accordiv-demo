import { isValidLegacyDemoData } from './legacyDemoValidation.js';
import { isValidV2Data } from './legacyV2Validation.js';
import { isValidDemoData } from './demoValidation.js';
import { upgradeDemoData } from '../data/upgradeDemoData.js';
import { upgradeBillingData } from '../data/upgradeBillingData.js';
import { DEFAULT_SETTINGS } from './settingsRules.js';

const optionalSnapshotFields = (snapshot) =>
  snapshot && {
    ...snapshot,
    company: snapshot.company ?? '',
    phone: snapshot.phone ?? '',
    address: snapshot.address ?? '',
  };

function optionalDefaults(data) {
  return {
    ...data,
    ...(data.version === 3
      ? { settings: data.settings === undefined ? { ...DEFAULT_SETTINGS } : data.settings }
      : {}),
    clients: data.clients?.map((client) => ({
      ...client,
      company: client.company ?? client.name,
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    })),
    projects: data.projects?.map((project) => ({
      ...project,
      description: project.description ?? '',
      startDate: project.startDate ?? '',
      deadline: project.deadline ?? '',
    })),
    invoices: data.invoices?.map((invoice) => ({
      ...invoice,
      ...(data.version === 3
        ? {
            projectId: invoice.projectId ?? '',
            cancellationReason: invoice.cancellationReason ?? '',
            billingSnapshot: optionalSnapshotFields(invoice.billingSnapshot),
            issuerSnapshot: optionalSnapshotFields(invoice.issuerSnapshot),
          }
        : {}),
      notes: invoice.notes ?? '',
      paymentInstructions: invoice.paymentInstructions ?? '',
      migrationNote: invoice.migrationNote ?? '',
    })),
    payments: data.payments?.map((payment) => ({
      ...payment,
      ...(data.version === 3 ? { voidReason: payment.voidReason ?? '' } : {}),
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
    })),
  };
}

/**
 * Converts supported saved schemas without changing the supplied object.
 * Returns null for invalid data; only the repository decides whether to restore samples.
 */
export function migrateDemoData(raw) {
  try {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.version === 3) {
      const data = optionalDefaults(raw);
      return isValidDemoData(data) ? data : null;
    }
    if (![1, 2].includes(raw.version)) return null;
    const legacy = {
      ...raw,
      invoices: raw.invoices?.map((invoice) => {
        const total = invoice.totalAmount ?? invoice.total;
        const needsOpening =
          invoice.items === undefined ||
          (Array.isArray(invoice.items) && invoice.items.length === 0);
        return {
          ...invoice,
          status: ['issued', 'unpaid', 'partial', 'paid', 'overdue'].includes(invoice.status)
            ? 'sent'
            : invoice.status,
          items:
            needsOpening && Number.isSafeInteger(total) && total >= 0
              ? [
                  {
                    description: 'Opening balance — imported legacy invoice',
                    quantity: 1,
                    unitAmount: total,
                  },
                ]
              : invoice.items,
        };
      }),
    };
    let data;
    if (legacy.version === 1) {
      if (!isValidLegacyDemoData(legacy)) return null;
      data = upgradeDemoData(legacy);
    } else {
      data = optionalDefaults(legacy);
      if (!isValidV2Data(data)) return null;
    }
    const migrated = upgradeBillingData(data);
    return isValidDemoData(migrated) ? migrated : null;
  } catch {
    return null;
  }
}
