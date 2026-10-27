import { StatusBadge } from './ui.jsx';
import { invoiceHasPartialPayment, invoiceStatus } from '../services/finance.js';

export default function InvoiceStatus({ invoice, payments, today }) {
  const status = invoiceStatus(invoice, payments, today);
  return (
    <span className="invoice-statuses">
      <StatusBadge status={status} />
      {status === 'overdue' && invoiceHasPartialPayment(invoice, payments) && (
        <StatusBadge status="partial" />
      )}
    </span>
  );
}
