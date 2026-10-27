import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import PublicContactLinks from './PublicContactLinks.jsx';
import Notice from './Notice.jsx';
import { Button } from './ui.jsx';
import { useMountedRef } from '../hooks/useWorkspace.js';
import { MARKETING_CONTACT } from '../config/marketingContact.js';
import { SERVICE_PACKAGES } from '../config/servicePackages.js';
import { EMPTY_ENQUIRY, ENQUIRY_FORM_NAME, ENQUIRY_LIMITS, netlifyFormReady, submitEnquiry, validateEnquiry } from '../services/enquiry.js';

export default function SalesEnquiry() {
  const [values, setValues] = useState({ ...EMPTY_ENQUIRY });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('error');
  const [sequence, setSequence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const mounted = useMountedRef();
  const formRef = useRef(null), headingRef = useRef(null), lock = useRef(false), request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  function change(event) {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
    setErrors(previous => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      const remaining = validateEnquiry({ ...values, [name]: value }).errors[name];
      if (remaining) next[name] = remaining; else delete next[name];
      return next;
    });
    setSent(false);
    if (feedbackType === 'success') setFeedback('');
  }
  // Change only the package so choosing a different service does not discard a partly completed enquiry.
  function selectPackage(service) {
    setValues(previous => ({ ...previous, service }));
    setErrors(previous => { const next = { ...previous }; delete next.service; return next; });
    setSent(false);
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current || sent) return;
    const result = validateEnquiry(values);
    setErrors(result.errors);
    if (!result.ok) {
      setFeedbackType('error'); setFeedback('Please check the highlighted enquiry fields.'); setSequence(previous => previous + 1);
      formRef.current?.elements.namedItem(Object.keys(result.errors)[0])?.focus();
      return;
    }
    lock.current = true; setBusy(true); setFeedback('');
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      await submitEnquiry(result.values, { signal: controller.signal });
      if (!mounted.current) return;
      setSent(true); setFeedbackType('success');
      setFeedback('Your enquiry was received. Thank you. We will respond using the contact details you supplied.');
    } catch (error) {
      if (!mounted.current) return;
      setFeedbackType('error');
      setFeedback(error.message.startsWith('Online enquiries') || error.message.startsWith('Submission could') ? error.message :
        'We could not confirm receipt. Your entries are kept. Contact us on WhatsApp or by email before retrying.');
    } finally {
      clearTimeout(timeout); request.current = null; lock.current = false;
      if (mounted.current) { setBusy(false); setSequence(previous => previous + 1); }
    }
  }
  function field(name, label, options = {}) {
    const { textarea, help, ...attributes } = options;
    const id = 'enquiry-' + name;
    const props = { id, name, value: values[name], onChange: change, maxLength: ENQUIRY_LIMITS[name],
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': [help && id + '-help', errors[name] && id + '-error'].filter(Boolean).join(' ') || undefined,
      ...attributes };
    return <div className={'enquiry-field ' + (textarea ? 'enquiry-wide' : '')}>
      <label htmlFor={id}>{label}</label>
      {textarea ? <textarea {...props} rows={4} /> : <input {...props} />}
      {help && <p id={id + '-help'} className="enquiry-help">{help}</p>}
      {errors[name] && <p id={id + '-error'} className="enquiry-error">{errors[name]}</p>}
    </div>;
  }
  return (
    <section id="sales" className="marketing-section sales-section" aria-labelledby="sales-title">
      <div className="sales-introduction marketing-content">
        <p className="eyebrow">GET ACCORDIV</p>
        <h2 id="sales-title" tabIndex={-1}>A setup that fits<br />your working day.</h2>
        <p>Explore the services below, then tell us what you need. Accordiv supports clients, projects, invoices, manual payment records, balances, business settings and PDFs. Setup is discussed individually; this is not hosted account registration.</p>
      </div>
      <div className="service-packages marketing-content" aria-label="Accordiv service packages">
        {SERVICE_PACKAGES.map(item => <article className="service-package" key={item.value}>
          <h3>{item.label}</h3><p>{item.description}</p><p className="package-terms">{item.terms}</p>
          <Button variant="secondary" disabled={busy} onClick={() => selectPackage(item.value)} aria-label={'Enquire about ' + item.label}>
            Choose this service <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </article>)}
      </div>
      <form ref={formRef} className="enquiry-card marketing-content" name={ENQUIRY_FORM_NAME} method="POST" action="/" data-netlify="true" netlify-honeypot="bot-field" noValidate onSubmit={submit} aria-labelledby="enquiry-title" aria-busy={busy}>
        <h3 id="enquiry-title" ref={headingRef} tabIndex={-1}>Tell us about your setup</h3>
        <p id="enquiry-privacy" className="enquiry-help">We use your contact details to respond to this enquiry. Please do not include passwords, payment details or confidential client records.</p>
        {!netlifyFormReady(document) && <p className="enquiry-help enquiry-availability">Online sending is unavailable on this local or unconfigured site. You can review this form and contact us directly on WhatsApp or by email. Nothing is sent by filling it in.</p>}
        <input type="hidden" name="form-name" value={ENQUIRY_FORM_NAME} />
        <div hidden><label>Leave this blank<input name="bot-field" value={values['bot-field']} onChange={change} tabIndex={-1} autoComplete="off" /></label></div>
        <fieldset disabled={busy}>
          <legend className="visually-hidden">Your enquiry</legend>
          <div className="enquiry-fields">
            {field('name', 'Name (required)', { required: true, autoComplete: 'name' })}
            {field('email', 'Email (required)', { type: 'email', required: true, autoComplete: 'email' })}
            {field('phone', 'Phone / WhatsApp (optional)', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', help: 'Use 11 digits starting with 0, for example 09012345678. Format only; no spaces or country code.' })}
            {field('business', 'Business name (optional)', { autoComplete: 'organization' })}
            <div className="enquiry-field enquiry-wide">
              <label htmlFor="enquiry-service">Service/package (required)</label>
              <select id="enquiry-service" name="service" value={values.service} onChange={change} required aria-invalid={errors.service ? true : undefined} aria-describedby={errors.service ? 'enquiry-service-error' : undefined}>
                <option value="">Choose a service</option>{SERVICE_PACKAGES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              {errors.service && <p id="enquiry-service-error" className="enquiry-error">{errors.service}</p>}
            </div>
            {field('message', 'Tell us briefly what you have in mind (required)', { textarea: true, required: true })}
            {field('integrations', 'Extra features or integrations (optional)', { textarea: true })}
            {field('budget', 'Estimated budget for your selected service (\u20a6) (optional)', { help: 'Leave blank, enter an amount without commas (for example 150000), or write Not sure yet.' })}
          </div>
          <Button type="submit" disabled={busy || sent}>{busy ? 'Sending enquiry\u2026' : sent ? 'Enquiry received' : 'Send enquiry'}</Button>
        </fieldset>
        <p role="status" className="enquiry-help">{busy ? 'Sending. Please wait before trying again.' : sent ? 'This enquiry has been received. Edit a field to prepare another enquiry.' : ''}</p>
        <Notice key={sequence} message={feedback} type={feedbackType} onDismiss={() => setFeedback('')} />
      </form>
      <div className="sales-contact">
        <h3>Prefer a direct conversation?</h3>
        <p>WhatsApp is a simple way to discuss a package or ask a question.</p>
        <PublicContactLinks />
        <p className="public-email">{MARKETING_CONTACT.email}</p>
      </div>
    </section>
  );
}
