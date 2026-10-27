import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams } from 'react-router-dom';
import { Card, PageHeading, StatusBadge } from '../components/ui.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import BillingAction from '../components/BillingAction.jsx';
import { PAYMENT_METHODS } from '../services/billingRules.js';
import { formatMoney } from '../utils/money.js';
import { formatDate } from '../utils/date.js';

export default function PaymentDetail() {
  const { id } = useParams();
  const { data, basePath } = useWorkspace();
  const payment = data.payments.find((record) => record.id === id);
  if (!payment) return <MissingRecord type="payments" />;
  const invoice = data.invoices.find((record) => record.id === payment.invoiceId);
  return (
    <>
      <PageHeading
        eyebrow="MANUAL PAYMENT RECORD"
        title={formatMoney(payment.amount)}
        description="This records money already received; it does not collect or refund money."
      >
        <Link className="app-button button-secondary" to={`${basePath}/payments`}>
          All payments
        </Link>
      </PageHeading>
      <Card className="billing-detail">
        <StatusBadge status={payment.status} />
        <dl className="billing-dates">
          <dt>Invoice</dt>
          <dd>
            <Link to={`${basePath}/invoices/${invoice.id}`}>{invoice.number}</Link>
          </dd>
          <dt>Payment date</dt>
          <dd>{formatDate(payment.date, { year: 'numeric' })}</dd>
          <dt>Method</dt>
          <dd>{PAYMENT_METHODS[payment.method]}</dd>
          <dt>Reference</dt>
          <dd className="preserve-text">{payment.reference || 'Not provided'}</dd>
          <dt>Notes</dt>
          <dd className="preserve-text">{payment.notes || 'Not provided'}</dd>
          <dt>Recorded at</dt>
          <dd>{payment.createdAt}</dd>
          {payment.status === 'voided' && (
            <>
              <dt>Voided at</dt>
              <dd>{payment.voidedAt}</dd>
              <dt>Void reason</dt>
              <dd className="preserve-text">{payment.voidReason}</dd>
            </>
          )}
        </dl>
        {payment.status === 'active' ? (
          <BillingAction
            label="Void payment"
            method="voidPayment"
            id={id}
            needsReason
            explanation="Void a mistaken record with a reason. The original record remains visible, but stops contributing to payments received and invoice settlement. This does not refund money."
          />
        ) : (
          <p className="record-notice">
            This record is excluded from received totals and invoice settlement. Its original amount
            and details have been preserved.
          </p>
        )}
      </Card>
    </>
  );
}
