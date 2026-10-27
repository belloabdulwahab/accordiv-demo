import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { Card, EmptyState, PageHeading, StatusBadge } from '../components/ui.jsx';
import { ArchiveAction, InvoiceSummary, MissingRecord } from '../components/RecordTools.jsx';

export default function ClientDetail() {
  const { id } = useParams();
  const { data, basePath, isOwner } = useWorkspace();
  const client = data.clients.find((record) => record.id === id);
  if (!client) return <MissingRecord type="clients" />;
  const projects = data.projects.filter((project) => project.clientId === id);
  return (
    <>
      <Link className="back-link" to={`${basePath}/clients`}>
        <ArrowLeft size={15} aria-hidden="true" />
        All clients
      </Link>
      <PageHeading
        eyebrow={client.archived ? 'ARCHIVED CLIENT' : 'CLIENT DETAILS'}
        title={client.name}
        description={client.company ? client.contact : 'Your client relationship, in one place.'}
      >
        <div className="record-actions">
          <Link className="app-button button-primary" to={`${basePath}/clients/${id}/edit`}>
            <Pencil size={16} aria-hidden="true" />
            Edit client
          </Link>
          <ArchiveAction record={client} type="clients" />
        </div>
      </PageHeading>
      {client.archived && (
        <p className="record-notice">
          This client is archived. Existing records are preserved, but new projects cannot be
          assigned to them.
        </p>
      )}
      <div className="detail-columns">
        <Card className="detail-card">
          <h2>Contact information</h2>
          <dl className="detail-fields">
            <div>
              <dt>Contact name</dt>
              <dd>{client.contact}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{client.company || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{client.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{client.phone || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd className="preserve-lines">{client.address || 'Not provided'}</dd>
            </div>
          </dl>
        </Card>
        <Card className="detail-card">
          <h2>Notes</h2>
          <p className="preserve-lines detail-copy">{client.notes || 'No notes added yet.'}</p>
          <p className="field-hint">
            {isOwner ? 'Client details are saved in your owner account. No emails are sent.' : 'Demo information stays in this browser tab. No emails are sent.'}
          </p>
        </Card>
      </div>
      <Card className="related-card">
        <div className="card-heading">
          <div>
            <h2>Linked projects</h2>
            <p>Includes archived projects and their current status.</p>
          </div>
          {!client.archived && (
            <Link className="text-link" to={`${basePath}/projects/new?client=${encodeURIComponent(id)}`}>
              <Plus size={15} />
              Add project
            </Link>
          )}
        </div>
        {projects.length ? (
          <ul className="related-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link to={`${basePath}/projects/${project.id}`}>{project.name}</Link>
                <div className="related-badges">
                  <StatusBadge status={project.status} />
                  {project.archived && <span className="record-state is-archived">Archived</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No linked projects">
            Projects assigned to this client will appear here.
          </EmptyState>
        )}
      </Card>
      <InvoiceSummary invoices={data.invoices.filter((invoice) => invoice.clientId === id)} />
    </>
  );
}
