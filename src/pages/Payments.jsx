import { useWorkspace } from '../hooks/useWorkspace.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHeading, SearchInput } from '../components/ui.jsx';
import PaymentTable from '../components/PaymentTable.jsx';
import { PAYMENT_METHODS } from '../services/billingRules.js';
import { receivedTotal } from '../services/finance.js';
import { formatMoney } from '../utils/money.js';

export default function Payments() {
  const { data, basePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [clientId, setClientId] = useState('');
  const payments = data.payments
    .filter((payment) => {
      const invoice = data.invoices.find((record) => record.id === payment.invoiceId);
      const client = data.clients.find((record) => record.id === invoice.clientId);
      return (
        (!status || payment.status === status) &&
        (!method || payment.method === method) &&
        (!clientId || clientId === client.id) &&
        `${invoice.number} ${client.name} ${payment.reference} ${payment.notes}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeading
        eyebrow="MONEY RECEIVED"
        title="Payments"
        description="A history of manually recorded payments, including voided records."
      >
        <Link className="app-button button-primary" to={`${basePath}/invoices`}>
          Choose an invoice
        </Link>
      </PageHeading>
      <Card>
        <div className="record-toolbar">
          <SearchInput
            id="payment-search"
            label="Search payments"
            placeholder="Client, invoice or reference…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {[
            ['payment-status', 'Status', status, setStatus, { active: 'Active', voided: 'Voided' }],
            ['payment-method', 'Method', method, setMethod, PAYMENT_METHODS],
            [
              'payment-client',
              'Client',
              clientId,
              setClientId,
              Object.fromEntries(data.clients.map((client) => [client.id, client.name])),
            ],
          ].map(([id, label, value, setter, options]) => (
            <div className="inline-filter" key={id}>
              <label htmlFor={id}>{label}</label>
              <select id={id} value={value} onChange={(event) => setter(event.target.value)}>
                <option value="">
                  All {label === 'Status' ? 'statuses' : `${label.toLowerCase()}s`}
                </option>
                {Object.entries(options).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="billing-filter-note">
          Received in this selection: <strong>{formatMoney(receivedTotal(payments))}</strong> ·
          Voided records excluded.
        </p>
        <PaymentTable payments={payments} />
        <div className="table-footer">
          Showing {payments.length} of {data.payments.length} records
        </div>
      </Card>
    </>
  );
}
