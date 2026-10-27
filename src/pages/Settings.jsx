import { useMountedRef, useWorkspace } from '../hooks/useWorkspace.js';
import Notice from '../components/Notice.jsx';
import { PHONE_GUIDANCE } from '../services/identityRules.js';
import { validateSettings } from '../services/settingsRules.js';
import { useRef, useState } from 'react';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import FormField from '../components/FormField.jsx';
import { SETTINGS_LIMITS } from '../services/settingsRules.js';

export default function Settings() {
  const { data, mutate, isOwner, isCurrent } = useWorkspace();
  const mounted = useMountedRef();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState(() => ({
    ...data.settings,
    paymentTermDays: String(data.settings.paymentTermDays),
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [noticeSequence, setNoticeSequence] = useState(0);
  const formRef = useRef(null);

  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setSaved(false); setMessage(''); setErrors({});
    try {
    const result = await mutate('saveSettings', values);
    if (!mounted.current || !isCurrent()) return;
    setErrors(result.errors || {});
    if (Object.keys(result.errors || {}).length) requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
    setSaved(result.ok);
    setNoticeSequence(previous => previous + 1);
    if (!result.ok) setMessage(result.message);
    else {
      setValues({ ...result.record, paymentTermDays: String(result.record.paymentTermDays) });
      setMessage(isOwner ? 'Business settings saved.' : 'Settings saved in this demo workspace.');

    }
    } catch (failure) {
      if (mounted.current && isCurrent()) setMessage(failure.message || 'Settings could not be saved. Your entries are still here.');
    } finally {
      lock.current = false;
      if (mounted.current && isCurrent()) setBusy(false);
    }
  }
  function field(name) {
    return {
      name,
      value: values[name],
      error: errors[name],
      maxLength: SETTINGS_LIMITS[name],
      onChange: (event) => {
        setSaved(false);
        const next = { ...values, [name]: event.target.value };
        setValues(next);
        const checked = validateSettings(next, data.settings);
        const remaining = Object.fromEntries(Object.entries(errors).filter(([field]) => Object.hasOwn(checked.errors, field)));
        setErrors(remaining);
        if (saved || Object.keys(errors).length && !Object.keys(remaining).length) setMessage('');
      },
    };
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR BUSINESS"
        title="Settings"
        description="Business details and a useful starting point for your next invoice."
      />
      <Card className="form-card">
        <p className="record-notice">
          {isOwner ? 'These business details are saved privately and appear on newly issued invoices. Sales enquiries on the public page use separate developer contact information.' : 'This is a temporary demo. Use fictional business details. Sales enquiries on the public page use separate developer contact information.'}
        </p>
        <form ref={formRef} noValidate aria-label="Business settings" onSubmit={save}>
          <Notice key={noticeSequence} message={message} type={saved ? 'success' : 'error'} onDismiss={() => setMessage('')}
            className={saved ? 'settings-saved' : 'form-error-summary'} />
          <h2 className="billing-section-title">Business details</h2>
          <div className="form-grid">
            <FormField label="Business name" {...field('name')} required />
            <FormField label="Contact email" {...field('email')} type="email" />
            <FormField
              label="Phone"
              {...field('phone')}
              type="tel"
              hint={PHONE_GUIDANCE}
              inputMode="numeric"
              pattern="0[0-9]{10}"
            />
            <FormField
              label="Website"
              {...field('website')}
              type="url"
              hint="Full http:// or https:// address. Optional."
            />
            <div className="form-full-width">
              <FormField label="Business address" {...field('address')} as="textarea" rows={3} />
            </div>
          </div>
          <h2 className="billing-section-title">Invoice defaults</h2>
          <p className="field-hint">
            Defaults fill new invoices only. You can change them on each draft. Saved drafts keep
            their text and dates; issued and cancelled invoices keep their business snapshots.
          </p>
          <div className="form-grid">
            <FormField
              label="Default payment term (days)"
              {...field('paymentTermDays')}
              inputMode="numeric"
              maxLength={3}
              required
              hint="Whole days from 0 to 365; 0 means due on the issue date."
            />
            <div className="form-field">
              <label htmlFor="settings-currency">Currency</label>
              <input
                id="settings-currency"
                value="NGN — Nigerian naira"
                readOnly
                aria-describedby="currency-help"
              />
              <p className="field-hint" id="currency-help">
                Additional currencies are deferred.
              </p>
            </div>
            <FormField
              label="Default invoice notes"
              {...field('defaultNotes')}
              as="textarea"
              rows={5}
            />
            <FormField
              label="Default payment instructions"
              {...field('defaultPaymentInstructions')}
              as="textarea"
              rows={5}
            />
          </div>
          <p className="field-hint">
            PDFs use an embedded font with limited character coverage. Unsupported scripts or emoji
            show a download error; your saved text stays intact.
          </p>
          <div className="form-actions">
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
