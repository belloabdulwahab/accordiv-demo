import { useWorkspace } from '../hooks/useWorkspace.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Card, EmptyState, PageHeading, SearchInput } from '../components/ui.jsx';
import InvoiceTable from '../components/InvoiceTable.jsx';
import {
  INVOICE_STATUS_LABELS,
  invoiceHasPartialPayment,
  invoiceStatus,
} from '../services/finance.js';

export default function Invoices() {
  const { data, today, basePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('');
  const invoices = data.invoices
    .filter((invoice) => {
      const client = data.clients.find((record) => record.id === invoice.clientId);
      const matchesStatus =
        !status ||
        invoiceStatus(invoice, data.payments, today) === status ||
        (status === 'partial' && invoiceHasPartialPayment(invoice, data.payments));
      return (
        (!clientId || invoice.clientId === clientId) &&
        matchesStatus &&
        `${invoice.number} ${client.name} ${client.contact} ${invoice.billingSnapshot?.name || ''} ${invoice.notes}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeading
        eyebrow="CLEARER BILLING"
        title="Invoices"
        description="Draft, issue and track your invoices in one place."
      >
        <Link className="app-button button-primary" to={`${basePath}/invoices/new`}>
          <Plus size={17} aria-hidden="true" />
          Create invoice
        </Link>
      </PageHeading>
      <Card>
        <div className="record-toolbar">
          <SearchInput
            id="invoice-list-search"
            label="Search invoices"
            placeholder="Invoice number, client or notes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="inline-filter">
            <label htmlFor="invoice-client">Client</label>
            <select
              id="invoice-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">All clients</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.contact}
                  {client.archived ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-filter">
            <label htmlFor="invoice-status">Status</label>
            <select
              id="invoice-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="billing-filter-note">
          An overdue invoice may also be partially paid. Both facts are shown.
        </p>
        {invoices.length ? (
          <InvoiceTable invoices={invoices} />
        ) : (
          <EmptyState icon={FileText} title="No invoices to show">
            Try another search or filter, or create a draft for an active client.
          </EmptyState>
        )}
        <div className="table-footer">
          Showing {invoices.length} of {data.invoices.length} invoices · NGN
        </div>
      </Card>
    </>
  );
}
