import Notice from '../components/Notice.jsx';
import { validatePaymentInput } from '../services/billingRules.js';
import { useMountedRef, useWorkspace } from '../hooks/useWorkspace.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import FormField from '../components/FormField.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import { PAYMENT_METHODS } from '../services/billingRules.js';
import { invoiceBalance } from '../services/finance.js';
import { formatMoney, moneyInputValue } from '../utils/money.js';

function Editor({ invoice, balance, today }) {
  const { mutate, announce, basePath, isOwner, isCurrent } = useWorkspace();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    amount: moneyInputValue(balance),
    date: today,
    method: 'bank_transfer',
    reference: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  // Reuse this key when retrying the same form; the owner API checks both the key and payment details.
  const [submissionId] = useState(
    () => globalThis.crypto?.randomUUID?.() || `submission-${Date.now()}-${Math.random()}`,
  );
  const lock = useRef(false);
  const mounted = useMountedRef();
  const [busy, setBusy] = useState(false);
  const form = useRef(null);
  useEffect(() => {
    form.current?.querySelector('input')?.focus();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setErrors({}); setMessage('');
    try {
      const result = await mutate('recordPayment', invoice.id, values, submissionId);
      if (!mounted.current || !isCurrent()) return;
      if (!result.ok) {
        setErrors(result.errors || {});
        if (Object.keys(result.errors || {}).length) requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
        setMessage(result.message);
        lock.current = false;
      } else {
        announce('Payment recorded. No money was collected.', `${basePath}/payments/${result.record.id}`);
        navigate(`${basePath}/payments/${result.record.id}`);
      }
    } catch (failure) {
      if (!mounted.current || !isCurrent()) return;
      lock.current = false;
      setMessage(failure.message || 'Payment could not be recorded. Your entries are still here. Please try again.');
    } finally {
      if (mounted.current && isCurrent()) setBusy(false);
    }
  }
  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event) => {
      const next = { ...values, [name]: event.target.value };
      setValues(next);
      const checked = validatePaymentInput(next, today);
      if (checked.value.amount > balance) checked.errors.amount = 'The amount cannot exceed the remaining balance.';
      setErrors(previous => Object.fromEntries(Object.entries(previous).filter(([field]) => Object.hasOwn(checked.errors, field))));
    },
  });
  return (
    <>
      <PageHeading
        eyebrow={invoice.number}
        title="Record payment"
        description="Record money already received. This action does not collect money."
      />
      <Card className="form-card">
        <form ref={form} noValidate onSubmit={submit} aria-label="Record payment">
          <Notice message={message} onDismiss={() => setMessage('')} className="form-error-summary" />
          <p className="record-notice">
            Current outstanding balance: <strong>{formatMoney(balance)}</strong>. Partial payments
            are welcome.
          </p>
          <div className="form-grid">
            <FormField
              label="Amount (NGN)"
              {...field('amount')}
              required
              inputMode="decimal"
              maxLength={30}
            />
            <FormField label="Payment date" {...field('date')} type="date" min={isOwner ? '1000-01-01' : undefined} max={today} required />
            <FormField label="Method" {...field('method')} as="select" required>
              {Object.entries(PAYMENT_METHODS).map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </FormField>
            <FormField label="Reference" {...field('reference')} maxLength={200} />
            <div className="form-full-width">
              <FormField
                label="Notes"
                {...field('notes')}
                as="textarea"
                rows={4}
                maxLength={3000}
              />
            </div>
          </div>
          <div className="form-actions">
            <Link className="app-button button-secondary" to={`${basePath}/invoices/${invoice.id}`}>
              Cancel
            </Link>
            <Button type="submit" disabled={busy}>{busy ? 'Recording…' : 'Record payment'}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
export default function PaymentForm() {
  const { id } = useParams();
  const { data, today, basePath } = useWorkspace();
  const invoice = data.invoices.find((record) => record.id === id);
  if (!invoice) return <MissingRecord type="invoices" />;
  const balance = invoiceBalance(invoice, data.payments);
  if (invoice.status !== 'issued' || balance <= 0)
    return (
      <Card className="billing-detail">
        <h1>Payment unavailable</h1>
        <p>Only issued invoices with a remaining balance can receive payments.</p>
        <Link to={`${basePath}/invoices/${id}`}>Back to invoice</Link>
      </Card>
    );
  return <Editor key={id} invoice={invoice} balance={balance} today={today} />;
}
