import { isDateOnly } from '../utils/date.js';
import { invoiceTotal } from './finance.js';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
const money = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000_000;
const records = (value) =>
  Array.isArray(value) &&
  value.length <= 1000 &&
  value.every((record) => object(record) && text(record.id)) &&
  new Set(value.map((record) => record.id)).size === value.length;

// Browser data is untrusted. Validate the entire graph before exposing any record to React.
export function isValidLegacyDemoData(data) {
  if (!object(data) || data.version !== 1 || !isDateOnly(data.createdOn)) return false;
  if (![data.clients, data.projects, data.invoices, data.payments].every(records)) return false;
  if (
    !data.clients.every(
      (client) =>
        text(client.name) &&
        text(client.contact) &&
        text(client.email) &&
        /^[^@\s]+@(?:[a-z0-9-]+\.)*example\.com$/i.test(client.email) &&
        text(client.initials) &&
        ['violet', 'blue', 'orange', 'green'].includes(client.color),
    )
  )
    return false;
  const clientIds = new Set(data.clients.map((client) => client.id));
  if (
    !data.projects.every(
      (project) =>
        clientIds.has(project.clientId) &&
        text(project.name) &&
        ['active', 'completed', 'paused'].includes(project.status) &&
        isDateOnly(project.deadline) &&
        Number.isInteger(project.progress) &&
        project.progress >= 0 &&
        project.progress <= 100,
    )
  )
    return false;
  if (
    !data.invoices.every((invoice) => {
      const project = data.projects.find((record) => record.id === invoice.projectId);
      return (
        clientIds.has(invoice.clientId) &&
        project?.clientId === invoice.clientId &&
        text(invoice.number) &&
        ['sent', 'draft', 'cancelled'].includes(invoice.status) &&
        isDateOnly(invoice.issuedDate) &&
        isDateOnly(invoice.dueDate) &&
        invoice.dueDate >= invoice.issuedDate &&
        Array.isArray(invoice.items) &&
        invoice.items.length > 0 &&
        invoice.items.length <= 100 &&
        invoice.items.every(
          (item) =>
            object(item) &&
            text(item.description) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            item.quantity <= 10000 &&
            money(item.unitAmount),
        ) &&
        money(invoiceTotal(invoice))
      );
    })
  )
    return false;
  if (
    !data.payments.every(
      (payment) =>
        data.invoices.some(
          (invoice) => invoice.id === payment.invoiceId && invoice.status === 'sent',
        ) &&
        money(payment.amount) &&
        payment.amount > 0 &&
        isDateOnly(payment.date),
    )
  )
    return false;
  return data.invoices.every(
    (invoice) =>
      data.payments
        .filter((payment) => payment.invoiceId === invoice.id)
        .reduce((sum, payment) => sum + payment.amount, 0) <= invoiceTotal(invoice),
  );
}
