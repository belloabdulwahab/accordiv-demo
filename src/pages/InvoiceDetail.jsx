import Notice from '../components/Notice.jsx';
import { useMountedRef, useWorkspace } from '../hooks/useWorkspace.js';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import BillingAction from '../components/BillingAction.jsx';
import InvoiceStatus from '../components/InvoiceStatus.jsx';
import PaymentTable from '../components/PaymentTable.jsx';
import { invoiceBilling } from '../services/billingRules.js';
import { invoiceBalance, invoicePaid, invoiceTotal } from '../services/finance.js';
import { downloadInvoicePdf } from '../services/invoicePdf.js';
import { formatMoney } from '../utils/money.js';
import { formatDate } from '../utils/date.js';
import { lineTotal } from '../utils/safeMoney.js';
import { issuerFromSettings } from '../services/settingsRules.js';
import IssuerDetails from '../components/IssuerDetails.jsx';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data, today, mutate, announce, basePath, isOwner, isCurrent, pdfData, downloadOwnerPdf } = useWorkspace();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const downloadLock = useRef(false);
  const duplicateLock = useRef(false);
  const [duplicating, setDuplicating] = useState(false);
  const mounted = useMountedRef();
  const invoice = data.invoices.find((record) => record.id === id);
  if (!invoice) return <MissingRecord type="invoices" />;
  const billing = invoiceBilling(invoice, data.clients);
  const paid = invoicePaid(invoice, data.payments);
  const balance = invoiceBalance(invoice, data.payments);
  async function download() {
    if (downloadLock.current) return;
    downloadLock.current = true;
    setDownloading(true);
    setError('');
    try {
      if (isOwner) {
        const fresh = await pdfData(id);
        if (!mounted.current || !isCurrent()) return;
        await downloadOwnerPdf(fresh.snapshot.data, id, fresh.today, () => mounted.current && isCurrent());
      } else await downloadInvoicePdf(data, id, today);
    } catch (failure) {
      if (mounted.current && isCurrent()) setError(`PDF download failed. ${failure.message || 'Please try again.'}`);
    } finally {
      downloadLock.current = false;
      if (mounted.current && isCurrent()) setDownloading(false);
    }
  }
  async function duplicate() {
    if (duplicateLock.current) return;
    duplicateLock.current = true; setDuplicating(true); setError('');
    try {
      const result = await mutate('duplicateInvoice', id);
      if (!mounted.current || !isCurrent()) return;
      if (!result.ok) setError(result.message);
      else {
        announce('Created a new draft without a number or payments.', `${basePath}/invoices/${result.record.id}/edit`);
        navigate(`${basePath}/invoices/${result.record.id}/edit`);
      }
    } catch (failure) {
      if (mounted.current && isCurrent()) setError(failure.message || 'Duplication failed. Please try again.');
    } finally {
      duplicateLock.current = false;
      if (mounted.current && isCurrent()) setDuplicating(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="INVOICE DETAILS"
        title={invoice.number || 'Unnumbered draft'}
        description={isOwner ? 'Your billing record · NGN' : 'Demo billing record · NGN'}
      >
        <Link className="app-button button-secondary" to={`${basePath}/invoices`}>
          All invoices
        </Link>
      </PageHeading>
      <div className="billing-actions">
        {invoice.status === 'draft' && (
          <>
            <Link className="app-button button-primary" to={`${basePath}/invoices/${id}/edit`}>
              Edit draft
            </Link>
            <BillingAction
              label="Issue invoice"
              method="issueInvoice"
              id={id}
              disabled={isOwner && !data.settings.name}
              explanation={isOwner ? 'This records issuance and assigns your next invoice number. Billing and business details, dates and charges will be locked. It does not email the client.' : 'This records issuance and assigns a demo-local invoice number. Billing details, dates and charges will be locked. It does not email the client.'}
            />
          </>
        )}
        {invoice.status === 'issued' && (
          <>
            <BillingAction
              label="Cancel invoice"
              method="cancelInvoice"
              id={id}
              needsReason
              disabled={paid > 0}
              explanation="Cancel this invoice with a reason. Its number and history will remain; it will leave outstanding totals."
            />
            {balance > 0 && (
              <Link className="app-button button-primary" to={`${basePath}/invoices/${id}/payments/new`}>
                Record payment
              </Link>
            )}
          </>
        )}
        <Button variant="secondary" disabled={duplicating} onClick={duplicate}>
          {duplicating ? 'Duplicating…' : 'Duplicate as draft'}
        </Button>
        <Button variant="secondary" disabled={downloading} onClick={download}>
          {downloading ? 'Preparing PDF…' : 'Download PDF'}
        </Button>
      </div>
      <Notice message={error} onDismiss={() => setError('')} className="form-error-summary" />
      {invoice.status === 'issued' && paid > 0 && (
        <p className="record-notice">
          Cancellation is unavailable while active payments exist. Voiding a mistaken payment
          preserves its history and does not refund money.
        </p>
      )}
      <Card className="billing-detail">
        <InvoiceStatus invoice={invoice} payments={data.payments} today={today} />
        <IssuerDetails
          issuer={invoice.issuerSnapshot || issuerFromSettings(data.settings)}
          draft={invoice.status === 'draft'}
        />
        <div className="billing-columns">
          <div>
            <h2>
              {invoice.status === 'draft' ? 'Current billing details' : 'Issued billing snapshot'}
            </h2>
            <p className="preserve-text">
              <strong>{billing.name}</strong>
              <br />
              {billing.contact}
              <br />
              {billing.email}
              {billing.phone && (
                <>
                  <br />
                  {billing.phone}
                </>
              )}
              {billing.address && (
                <>
                  <br />
                  {billing.address}
                </>
              )}
            </p>
            <Link to={`${basePath}/clients/${invoice.clientId}`}>View current client</Link>
            {invoice.projectId && (
              <p>
                <Link to={`${basePath}/projects/${invoice.projectId}`}>View linked project</Link>
              </p>
            )}
          </div>
          <dl className="billing-dates">
            <dt>Issue date</dt>
            <dd>{formatDate(invoice.issuedDate, { year: 'numeric' })}</dd>
            <dt>Due date</dt>
            <dd>{formatDate(invoice.dueDate, { year: 'numeric' })}</dd>
            {invoice.issuedAt && (
              <>
                <dt>Issued at</dt>
                <dd>{invoice.issuedAt}</dd>
              </>
            )}
            {invoice.cancelledAt && (
              <>
                <dt>Cancelled at</dt>
                <dd>{invoice.cancelledAt}</dd>
                <dt>Cancellation reason</dt>
                <dd className="preserve-text">{invoice.cancellationReason}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="table-scroll" role="region" aria-label="Invoice line items" tabIndex={0}>
          <table className="invoice-table invoice-items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th className="text-end">Unit price</th>
                <th className="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="preserve-text">{item.description}</td>
                  <td>{item.quantity}</td>
                  <td className="text-end">{formatMoney(item.unitAmount)}</td>
                  <td className="text-end">{formatMoney(lineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="billing-totals">
          <dt>Invoice total</dt>
          <dd>{formatMoney(invoiceTotal(invoice))}</dd>
          <dt>Payments received</dt>
          <dd>{formatMoney(paid)}</dd>
          <dt>Outstanding balance</dt>
          <dd>{formatMoney(balance)}</dd>
        </dl>
        {invoice.status !== 'issued' && (
          <p className="field-hint">Draft and cancelled invoices are excluded from receivables.</p>
        )}
        {[
          ['Notes', invoice.notes],
          ['Payment instructions', invoice.paymentInstructions],
          ['Historical record note', invoice.migrationNote],
        ].map(
          ([label, value]) =>
            value && (
              <div key={label}>
                <h2>{label}</h2>
                <p className="preserve-text">{value}</p>
              </div>
            ),
        )}
        <p className="field-hint">
          {isOwner ? 'Issuing does not send email; payment recording does not collect money.' : 'DEMO — Sample document. Not a tax document. Issuing does not send email; payment recording does not collect money.'}
        </p>
      </Card>
      <Card>
        <div className="card-heading">
          <h2>Payment history</h2>
        </div>
        <PaymentTable payments={data.payments.filter((payment) => payment.invoiceId === id)} />
      </Card>
    </>
  );
}
