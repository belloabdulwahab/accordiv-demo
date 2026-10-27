import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link } from 'react-router-dom';
import { EmptyState, StatusBadge } from './ui.jsx';
import { formatMoney } from '../utils/money.js';
import { formatDate } from '../utils/date.js';
import { PAYMENT_METHODS } from '../services/billingRules.js';

export default function PaymentTable({ payments }) {
  const { data, basePath } = useWorkspace();
  if (!payments.length)
    return (
      <EmptyState title="No payments to show">
        Record an already-received payment from an issued invoice, or change your filters.
      </EmptyState>
    );
  return (
    <div className="table-scroll" role="region" aria-label="Payment history" tabIndex={0}>
      <table className="invoice-table payments-table">
        <caption className="visually-hidden">
          Manual payment records in NGN, including voided history.
        </caption>
        <thead>
          <tr>
            <th>Payment / Invoice</th>
            <th>Client</th>
            <th>Method / Reference</th>
            <th className="text-end">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const invoice = data.invoices.find((record) => record.id === payment.invoiceId);
            return (
              <tr key={payment.id}>
                <td>
                  <Link to={`${basePath}/payments/${payment.id}`}>
                    {formatDate(payment.date, { year: 'numeric' })}
                  </Link>
                  <div>
                    <Link to={`${basePath}/invoices/${invoice.id}`}>{invoice.number}</Link>
                  </div>
                </td>
                <td>{data.clients.find((client) => client.id === invoice.clientId).name}</td>
                <td>
                  {PAYMENT_METHODS[payment.method]}
                  <div>{payment.reference || 'No reference'}</div>
                </td>
                <td className="text-end">{formatMoney(payment.amount)}</td>
                <td>
                  <StatusBadge status={payment.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
