import { useWorkspace } from '../hooks/useWorkspace.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  FolderKanban,
  ReceiptText,
  Search,
  Wallet,
} from 'lucide-react';
import { Card, EmptyState, PageHeading, SearchInput, TextLink } from '../components/ui.jsx';
import {
  activePayments,
  dashboardSummary,
  invoiceBalance,
  invoiceStatus,
  invoiceTotal,
} from '../services/finance.js';
import { daysBetween, formatDate } from '../utils/date.js';
import { formatMoney } from '../utils/money.js';
import InvoiceStatus from '../components/InvoiceStatus.jsx';
import { sumMoney } from '../utils/safeMoney.js';
import { isActiveProject } from '../services/recordRules.js';

function StatCard({ label, value, note, icon: Icon, tone }) {
  return (
    <Card className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-note">
        <span className="stat-note-dot" />
        {note}
      </p>
    </Card>
  );
}

export default function Dashboard() {
  const { data, today, basePath, isOwner } = useWorkspace();
  const [query, setQuery] = useState('');
  const summary = dashboardSummary(data, today);
  const clients = new Map(data.clients.map((client) => [client.id, client]));
  const invoices = [...data.invoices].sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
  const filteredInvoices = invoices
    .filter((invoice) =>
      `${invoice.number} ${clients.get(invoice.clientId).name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);
  const projects = data.projects
    .filter((project) => isActiveProject(project) && project.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);
  const payments = activePayments(data.payments)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const settled = data.invoices.filter(
    (invoice) => invoiceStatus(invoice, data.payments, today) === 'paid',
  ).length;
  const collectionTotal = sumMoney([summary.received, summary.outstanding]);
  const collectedPercent = collectionTotal
    ? Math.round((summary.received / collectionTotal) * 100)
    : 0;

  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS, AT A GLANCE"
        title="A clearer view of your work."
        description={isOwner ? 'Here’s where your business stands.' : 'Welcome back, Jamie. Here’s where things stand.'}
      >
        <div className="date-chip">
          <CalendarDays size={16} aria-hidden="true" />
          <time dateTime={today}>
            {formatDate(today, { day: 'numeric', month: 'long', year: 'numeric' })}
          </time>
        </div>
      </PageHeading>
      <div className="row g-3 stats-grid">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Payments received"
            value={formatMoney(summary.received)}
            note="Recorded payments · all time"
            icon={Wallet}
            tone="green"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Outstanding balance"
            value={formatMoney(summary.outstanding)}
            note={`${summary.openInvoices} unpaid or partly paid invoices`}
            icon={ReceiptText}
            tone="blue"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Active projects"
            value={String(summary.activeProjects).padStart(2, '0')}
            note="Planned, in progress or on hold"
            icon={FolderKanban}
            tone="violet"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Overdue invoices"
            value={String(summary.overdue).padStart(2, '0')}
            note={summary.overdue ? 'Ready for your attention' : 'You’re all caught up'}
            icon={Clock3}
            tone="orange"
          />
        </div>
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <Card className="invoice-card">
            <div className="card-heading">
              <div>
                <h2>Recent invoices</h2>
                <p>A snapshot of your latest billing.</p>
              </div>
              <TextLink to={`${basePath}/invoices`}>Invoices</TextLink>
            </div>
            <div className="table-toolbar">
              <span className="table-count">
                Latest invoices <span>{invoices.length}</span>
              </span>
              <SearchInput
                id="invoice-search"
                label="Search invoices by client or invoice number"
                placeholder="Search invoices…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {filteredInvoices.length ? (
              <div
                className="table-scroll"
                role="region"
                aria-label="Recent invoices, scroll horizontally for more columns"
                tabIndex={0}
              >
                <table className="invoice-table">
                  <caption className="visually-hidden">
                    Recent invoices with total invoiced amount, remaining balance and derived
                    payment status. All amounts in NGN.
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
                    {filteredInvoices.map((invoice) => {
                      const client = clients.get(invoice.clientId);
                      return (
                        <tr key={invoice.id}>
                          <td>
                            <div className="client-cell">
                              <span
                                className={`client-avatar avatar-${client.color}`}
                                aria-hidden="true"
                              >
                                {client.initials}
                              </span>
                              <div>
                                <strong>{client.name}</strong>
                                <Link to={`${basePath}/invoices/${invoice.id}`}>
                                  {invoice.number || 'Unnumbered draft'}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td>
                            <time dateTime={invoice.dueDate}>{formatDate(invoice.dueDate)}</time>
                          </td>
                          <td className="text-end amount-cell">
                            <strong>{formatMoney(invoiceTotal(invoice))}</strong>
                            <span>{formatMoney(invoiceBalance(invoice, data.payments))} due</span>
                          </td>
                          <td>
                            <InvoiceStatus
                              invoice={invoice}
                              payments={data.payments}
                              today={today}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Search} title={query ? 'No matching invoices' : 'No invoices yet'}>
                {query
                  ? 'Try a client name or invoice number.'
                  : isOwner ? 'Create your first invoice to see its status and balance here.' : 'Your sample invoices will appear here after a demo reset.'}
              </EmptyState>
            )}
            <div className="table-footer">
              <span>
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </span>
              <span>Currency: NGN</span>
            </div>
          </Card>
          <Card className="payments-card">
            <div className="card-heading">
              <div>
                <h2>Recent payments</h2>
                <p>Money received, clearly recorded.</p>
              </div>
              <TextLink to={`${basePath}/payments`}>Payments</TextLink>
            </div>
            {payments.length ? (
              <ul className="payment-list">
                {payments.map((payment) => {
                  const invoice = data.invoices.find((record) => record.id === payment.invoiceId);
                  const client = clients.get(invoice.clientId);
                  return (
                    <li key={payment.id}>
                      <span className="payment-icon">
                        <ArrowDownLeft size={18} aria-hidden="true" />
                      </span>
                      <div className="payment-client">
                        <strong>{client.name}</strong>
                        <span>
                          <Link to={`${basePath}/payments/${payment.id}`}>
                            {invoice.number} · Manual payment
                          </Link>
                        </span>
                      </div>
                      <div className="payment-amount">
                        <strong>+{formatMoney(payment.amount)}</strong>
                        <time dateTime={payment.date}>{formatDate(payment.date)}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Wallet} title="No payments recorded">
                Recorded payments will appear here.
              </EmptyState>
            )}
          </Card>
        </div>
        <div className="dashboard-secondary">
          <Card className="deadlines-card">
            <div className="card-heading">
              <div>
                <h2>On the horizon</h2>
                <p>Upcoming project deadlines.</p>
              </div>
              <CalendarDays size={19} className="muted-icon" aria-hidden="true" />
            </div>
            {projects.length ? (
              <ul className="deadline-list">
                {projects.map((project) => {
                  const days = daysBetween(today, project.deadline);
                  return (
                    <li key={project.id}>
                      <div className="deadline-top">
                        <span
                          className={`project-client color-${clients.get(project.clientId).color}`}
                        >
                          {clients.get(project.clientId).name}
                        </span>
                        <span className={`deadline-days ${days <= 3 ? 'deadline-soon' : ''}`}>
                          {days < 0
                            ? `${Math.abs(days)}d overdue`
                            : days === 0
                              ? 'Due today'
                              : `In ${days} days`}
                        </span>
                      </div>
                      <h3>{project.name}</h3>
                      <div
                        className="project-progress"
                        role="progressbar"
                        aria-label={`${project.name} progress`}
                        aria-valuenow={project.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span style={{ width: `${project.progress}%` }} />
                      </div>
                      <div className="deadline-bottom">
                        <span>{project.progress}% complete</span>
                        <time dateTime={project.deadline}>{formatDate(project.deadline)}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={Check} title="A clear calendar">
                No active project deadlines to show.
              </EmptyState>
            )}
            <div className="card-bottom-link">
              <TextLink to={`${basePath}/projects`}>Project workspace</TextLink>
            </div>
          </Card>
          <Card className="collection-card">
            <div className="collection-icon">
              <FileText size={21} aria-hidden="true" />
            </div>
            <h2>Every payment, accounted for.</h2>
            <p>
              You’ve collected <strong>{collectedPercent}%</strong> of the value of your issued
              invoices.
            </p>
            <div
              className="collection-track"
              role="progressbar"
              aria-label="Issued invoice value collected"
              aria-valuenow={collectedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${collectedPercent}%` }} />
            </div>
            <div className="collection-legend">
              <span>
                <i />
                Received
              </span>
              <span>{formatMoney(summary.received)}</span>
            </div>
            <div className="collection-legend outstanding-legend">
              <span>
                <i />
                Outstanding
              </span>
              <span>{formatMoney(summary.outstanding)}</span>
            </div>
            <div className="collection-footnote">
              <Check size={15} aria-hidden="true" />
              {settled} fully paid {settled === 1 ? 'invoice' : 'invoices'}
              <ArrowUpRight size={15} aria-hidden="true" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
