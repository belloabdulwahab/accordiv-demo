import Notice from '../components/Notice.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';
import { clientChoices, projectChoices } from '../services/selectorChoices.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import FormField from '../components/FormField.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import { useRecordForm } from '../hooks/useRecordForm.js';
import {
  BILLING_LIMITS,
  eligibleProject,
  invoiceFormValues,
  parseInvoiceItems,
} from '../services/billingRules.js';
import { invoiceTotal } from '../services/finance.js';
import { formatMoney } from '../utils/money.js';
import { newInvoiceDefaults } from '../services/settingsRules.js';

function Editor({ invoice, data, today }) {
  const { basePath, isOwner } = useWorkspace();
  const form = useRecordForm(
    invoice ? invoiceFormValues(invoice) : newInvoiceDefaults(data.settings, today),
    'invoices',
    invoice?.id,
  );
  const { values, errors, message, busy, formRef, submit, change, setValues, clearErrors } = form;
  const clients = data.clients.filter(
    (client) => !client.archived || client.id === invoice?.clientId,
  );
  const projects = data.projects.filter(
    (project) =>
      eligibleProject(project, values.clientId) ||
      (invoice?.clientId === values.clientId && invoice?.projectId === project.id),
  );
  const parsed = parseInvoiceItems(values.items);
  const field = (name) => ({ name, value: values[name], error: errors[name], onChange: change });
  function changeClient(event) {
    const clientId = event.target.value;
    setValues((previous) => ({
      ...previous,
      clientId,
      projectId: data.projects.some(
        (project) => project.id === previous.projectId && eligibleProject(project, clientId),
      )
        ? previous.projectId
        : '',
    }));
  }
  function changeItem(index, key, value) {
    setValues((previous) => ({
      ...previous,
      items: previous.items.map((item, position) =>
        position === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  function removeItem(index) {
    clearErrors();
    setValues((previous) => ({
      ...previous,
      items: previous.items.filter((_, position) => position !== index),
    }));
    requestAnimationFrame(() => formRef.current?.querySelector('[data-add-item]')?.focus());
  }
  return (
    <>
      <PageHeading
        eyebrow="CLEARER BILLING"
        title={invoice ? 'Edit draft' : 'Create invoice'}
        description="Save a draft, then review it before issuing. All amounts are NGN. Fields marked * are required."
      />
      <Card className="form-card billing-form">
        <form ref={formRef} noValidate onSubmit={submit} aria-label="Invoice draft">
          <Notice message={message} onDismiss={form.dismissMessage} className="form-error-summary" />
          {!clients.length && (
            <p className="record-notice">
              Add or restore an active client first. <Link to={`${basePath}/clients/new`}>Add client</Link>
            </p>
          )}
          <div className="form-grid">
            <SearchableSelect label="Client" {...field('clientId')} onChange={changeClient}
              options={clientChoices(clients)} required hint="Search contact name, company or email." />
            <SearchableSelect label="Project" {...field('projectId')} options={projectChoices(projects, invoice?.projectId)}
              emptyOption="No project" hint="Optional. Search projects for this client; historical relationships can be retained." />
            <FormField label="Issue date" {...field('issuedDate')} type="date" min={isOwner ? '1000-01-01' : undefined} max={isOwner ? '9999-12-31' : undefined} required />
            <FormField label="Due date" {...field('dueDate')} type="date" min={isOwner ? '1000-01-01' : undefined} max={isOwner ? '9999-12-31' : undefined} required />
          </div>
          <h2 className="billing-section-title">Line items</h2>
          {errors.items && (
            <p role="alert" className="field-error">
              {errors.items}
            </p>
          )}
          {values.items.map((item, index) => (
            <fieldset className="invoice-line-editor" key={index}>
              <legend>Item {index + 1}</legend>
              <div className="form-grid">
                {['description', 'quantity', 'unitPrice'].map((key) => (
                  <FormField
                    key={key}
                    name={`item-${index}-${key}`}
                    label={
                      key === 'description'
                        ? 'Description'
                        : key === 'quantity'
                          ? 'Quantity'
                          : 'Unit price (NGN)'
                    }
                    value={item[key]}
                    onChange={(event) => changeItem(index, key, event.target.value)}
                    error={errors[`item-${index}-${key}`]}
                    as={key === 'description' ? 'textarea' : 'input'}
                    rows={key === 'description' ? 3 : undefined}
                    inputMode={
                      key === 'quantity' ? 'numeric' : key === 'unitPrice' ? 'decimal' : undefined
                    }
                    maxLength={key === 'description' ? BILLING_LIMITS.description : 30}
                    required
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                disabled={values.items.length === 1}
                onClick={() => removeItem(index)}
              >
                Remove item {index + 1}
              </Button>
            </fieldset>
          ))}
          <Button
            data-add-item
            variant="secondary"
            disabled={values.items.length >= BILLING_LIMITS.items}
            onClick={() => {
              clearErrors();
              setValues((previous) => ({
                ...previous,
                items: [...previous.items, { description: '', quantity: '1', unitPrice: '' }],
              }));
              requestAnimationFrame(() =>
                formRef.current
                  ?.querySelectorAll('.invoice-line-editor textarea')
                  .item(values.items.length)
                  ?.focus(),
              );
            }}
          >
            Add line item
          </Button>
          <p className="billing-total" aria-live="polite">
            Total:{' '}
            {Object.keys(parsed.errors).length
              ? 'Complete valid line items to calculate'
              : formatMoney(invoiceTotal({ items: parsed.items }))}
          </p>
          <p className="field-hint">
            Whole quantities from 1 to 10,000. Prices use up to two decimal places without commas.
            Tax and discounts are not included.
          </p>
          <div className="form-grid">
            <FormField
              label="Notes"
              {...field('notes')}
              as="textarea"
              rows={4}
              maxLength={BILLING_LIMITS.notes}
            />
            <FormField
              label="Payment instructions"
              {...field('paymentInstructions')}
              as="textarea"
              rows={4}
              maxLength={BILLING_LIMITS.paymentInstructions}
            />
          </div>
          <div className="form-actions">
            <Link
              className="app-button button-secondary"
              to={invoice ? `${basePath}/invoices/${invoice.id}` : `${basePath}/invoices`}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={busy || !clients.length}>
              {busy ? 'Saving…' : 'Save draft'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function InvoiceForm() {
  const { id } = useParams();
  const { data, today, basePath } = useWorkspace();
  const invoice = data.invoices.find((record) => record.id === id);
  if (id && !invoice) return <MissingRecord type="invoices" />;
  if (invoice && invoice.status !== 'draft')
    return (
      <Card className="record-detail">
        <h1>Invoice is locked</h1>
        <p>Only drafts can be edited. Duplicate this invoice to start a new draft.</p>
        <Link to={`${basePath}/invoices/${id}`}>Back to invoice</Link>
      </Card>
    );
  return <Editor key={id || 'new'} invoice={invoice} data={data} today={today} />;
}
