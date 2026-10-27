import DuplicateReview from '../components/DuplicateReview.jsx';
import Notice from '../components/Notice.jsx';
import { PHONE_GUIDANCE } from '../services/identityRules.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import FormField from '../components/FormField.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import { CLIENT_LIMITS } from '../services/recordRules.js';
import { useRecordForm } from '../hooks/useRecordForm.js';

function ClientEditor({ client }) {
  const { basePath, isOwner } = useWorkspace();
  const initial = Object.fromEntries(
    Object.keys(CLIENT_LIMITS).map((field) => [field, client?.[field] || '']),
  );
  const form = useRecordForm(
    initial,
    'clients',
    client?.id,
  );
  const { values, errors, message, busy, formRef, change, submit } = form;
  const fields = [
    { name: 'contact', label: 'Contact name', required: true, autoComplete: 'name' },
    {
      name: 'company',
      label: 'Company',
      autoComplete: 'organization',
      hint: 'Optional. Multiple contacts may share a company.',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      autoComplete: 'email',
      hint: isOwner ? 'Used for client records and invoice billing. Nothing will be emailed.' : 'Use fictional demo details. Nothing will be emailed.',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      autoComplete: 'tel',
      hint: PHONE_GUIDANCE,
      inputMode: 'numeric',
      pattern: '0[0-9]{10}',
    },
    { name: 'address', label: 'Address', as: 'textarea', rows: 3, autoComplete: 'street-address' },
    { name: 'notes', label: 'Notes', as: 'textarea', rows: 5 },
  ];
  return (
    <>
      <PageHeading
        eyebrow="CLIENT RELATIONSHIPS"
        title={client ? 'Edit client' : 'Add client'}
        description="Keep the useful details close. Fields marked * are required."
      />
      <Card className="form-card">
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-label={client ? 'Edit client' : 'Add client'}
        >
          <Notice message={message} onDismiss={form.dismissMessage} className="form-error-summary" />
          <DuplicateReview form={form} />
          <div className="form-grid">
            {fields.map((field) => (
              <FormField
                key={field.name}
                {...field}
                maxLength={CLIENT_LIMITS[field.name]}
                value={values[field.name]}
                onChange={change}
                error={errors[field.name]}
              />
            ))}
          </div>
          <div className="form-actions">
            <Link
              className="app-button button-secondary"
              to={client ? `${basePath}/clients/${client.id}` : `${basePath}/clients`}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : client ? 'Save changes' : 'Create client'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function ClientForm() {
  const { id } = useParams();
  const { data } = useWorkspace();
  const client = data.clients.find((record) => record.id === id);
  if (id && !client) return <MissingRecord type="clients" />;
  return <ClientEditor key={id || 'new'} client={client} />;
}
