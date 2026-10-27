import DuplicateReview from '../components/DuplicateReview.jsx';
import Notice from '../components/Notice.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';
import { clientChoices } from '../services/selectorChoices.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, PageHeading } from '../components/ui.jsx';
import FormField from '../components/FormField.jsx';
import { MissingRecord } from '../components/RecordTools.jsx';
import { PROJECT_LIMITS, PROJECT_STATUSES } from '../services/recordRules.js';
import { moneyInputValue } from '../utils/money.js';
import { useRecordForm } from '../hooks/useRecordForm.js';

function ProjectEditor({ project, clients, preferredClient }) {
  const { basePath, isOwner } = useWorkspace();
  const form = useRecordForm(
    {
      name: project?.name || '',
      clientId: project?.clientId || preferredClient,
      description: project?.description || '',
      fee: project ? moneyInputValue(project.fee) : '',
      startDate: project?.startDate || '',
      deadline: project?.deadline || '',
      status: project?.status || 'planned',
    },
    'projects',
    project?.id,
  );
  const { values, errors, message, busy, formRef, change, submit } = form;
  const choices = clients.filter((client) => !client.archived || client.id === project?.clientId);
  const fieldProps = (name) => ({
    name,
    value: values[name],
    onChange: change,
    error: errors[name],
  });
  return (
    <>
      <PageHeading
        eyebrow="PROJECT WORKSPACE"
        title={project ? 'Edit project' : 'Add project'}
        description="Give your next piece of work a clear starting point. Fields marked * are required."
      />
      <Card className="form-card">
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-label={project ? 'Edit project' : 'Add project'}
        >
          <Notice message={message} onDismiss={form.dismissMessage} className="form-error-summary" />
          <DuplicateReview form={form} />
          {!choices.length && (
            <p className="record-notice">
              You need an active client first. <Link to={`${basePath}/clients/new`}>Add a client</Link> or
              restore an archived client.
            </p>
          )}
          <div className="form-grid">
            <FormField
              label="Project title"
              {...fieldProps('name')}
              maxLength={PROJECT_LIMITS.name}
              required
            />
            <SearchableSelect label="Client" {...fieldProps('clientId')} options={clientChoices(choices)} required
              hint="Search name, company or email. An existing archived relationship can be retained; historical invoices stay unchanged." />
            <FormField
              label="Agreed fee (NGN)"
              {...fieldProps('fee')}
              inputMode="decimal"
              required
              maxLength={30}
              placeholder="0.00"
              hint="Planning amount only. Use up to 2 decimal places, without commas. Invoices and payments stay unchanged."
            />
            <FormField label="Status" {...fieldProps('status')} as="select" required>
              {Object.entries(PROJECT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FormField>
            <FormField
              label="Start date"
              {...fieldProps('startDate')}
              type="date"
              min={isOwner ? '1000-01-01' : undefined}
              max={isOwner ? '9999-12-31' : undefined}
              hint="Optional. Past dates are allowed."
            />
            <FormField
              label="Deadline"
              {...fieldProps('deadline')}
              type="date"
              min={isOwner ? '1000-01-01' : undefined}
              max={isOwner ? '9999-12-31' : undefined}
              hint="Optional. Must not be before the start date."
            />
            <div className="form-full-width">
              <FormField
                label="Description"
                {...fieldProps('description')}
                as="textarea"
                rows={5}
                maxLength={PROJECT_LIMITS.description}
              />
            </div>
          </div>
          <div className="form-actions">
            <Link
              className="app-button button-secondary"
              to={project ? `${basePath}/projects/${project.id}` : `${basePath}/projects`}
            >
              Cancel
            </Link>
            <Button type="submit" disabled={busy || !choices.length}>
              {busy ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function ProjectForm() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { data } = useWorkspace();
  const project = data.projects.find((record) => record.id === id);
  if (id && !project) return <MissingRecord type="projects" />;
  const preferredClient =
    data.clients.find((client) => client.id === search.get('client') && !client.archived)?.id || '';
  return (
    <ProjectEditor
      key={id || `new-${preferredClient}`}
      project={project}
      clients={data.clients}
      preferredClient={preferredClient}
    />
  );
}
