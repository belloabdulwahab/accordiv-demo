import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link } from 'react-router-dom';
import { invoiceBalance, invoiceTotal } from '../services/finance.js';
import { formatDate } from '../utils/date.js';
import { formatMoney } from '../utils/money.js';
import InvoiceStatus from './InvoiceStatus.jsx';

export default function InvoiceTable({ invoices }) {
  const { data, today, basePath } = useWorkspace();
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Invoices, scroll horizontally for more columns"
      tabIndex={0}
    >
      <table className="invoice-table">
        <caption className="visually-hidden">
          Invoices, totals and remaining balances in NGN.
        </caption>
        <thead>
          <tr>
            <th scope="col">Invoice / Client</th>
            <th scope="col">Due date</th>
            <th scope="col" className="text-end">
              Amount / Balance
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link className="invoice-number-link" to={`${basePath}/invoices/${invoice.id}`}>
                  {invoice.number || 'Unnumbered draft'}
                </Link>
                <div className="invoice-client-name">
                  {data.clients.find((client) => client.id === invoice.clientId).name}
                </div>
              </td>
              <td>{formatDate(invoice.dueDate, { year: 'numeric' })}</td>
              <td className="text-end amount-cell">
                <strong>{formatMoney(invoiceTotal(invoice))}</strong>
                <span>{formatMoney(invoiceBalance(invoice, data.payments))} due</span>
              </td>
              <td>
                <InvoiceStatus invoice={invoice} payments={data.payments} today={today} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
