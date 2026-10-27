import { useWorkspace } from '../hooks/useWorkspace.js';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Card, PageHeading, StatusBadge } from '../components/ui.jsx';
import { ArchiveAction, InvoiceSummary, MissingRecord } from '../components/RecordTools.jsx';
import { formatMoney } from '../utils/money.js';
import { formatDate } from '../utils/date.js';

export default function ProjectDetail() {
  const { id } = useParams();
  const { data, basePath } = useWorkspace();
  const project = data.projects.find((record) => record.id === id);
  if (!project) return <MissingRecord type="projects" />;
  const client = data.clients.find((record) => record.id === project.clientId);
  return (
    <>
      <Link className="back-link" to={`${basePath}/projects`}>
        <ArrowLeft size={15} aria-hidden="true" />
        All projects
      </Link>
      <PageHeading
        eyebrow={project.archived ? 'ARCHIVED PROJECT' : 'PROJECT DETAILS'}
        title={project.name}
        description="The scope, the people and the dates that matter."
      >
        <div className="record-actions">
          <Link className="app-button button-primary" to={`${basePath}/projects/${id}/edit`}>
            <Pencil size={16} aria-hidden="true" />
            Edit project
          </Link>
          <ArchiveAction record={project} type="projects" />
        </div>
      </PageHeading>
      {project.archived && (
        <p className="record-notice">
          This project is archived and excluded from the active-project dashboard. Its status and
          history are preserved.
        </p>
      )}
      <div className="detail-columns">
        <Card className="detail-card">
          <h2>Project overview</h2>
          <dl className="detail-fields">
            <div>
              <dt>Client</dt>
              <dd>
                <Link to={`${basePath}/clients/${client.id}`}>
                  {client.name} · {client.contact}
                </Link>
                {client.archived && <span className="inline-archived">Archived client</span>}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={project.status} />
              </dd>
            </div>
            <div>
              <dt>Agreed fee</dt>
              <dd>{formatMoney(project.fee)}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>
                {project.startDate ? formatDate(project.startDate, { year: 'numeric' }) : 'Not set'}
              </dd>
            </div>
            <div>
              <dt>Deadline</dt>
              <dd>
                {project.deadline ? formatDate(project.deadline, { year: 'numeric' }) : 'Not set'}
              </dd>
            </div>
          </dl>
          <p className="field-hint">
            The agreed fee is a planning amount. Changing it does not change invoices or recorded
            payments.
          </p>
        </Card>
        <Card className="detail-card">
          <h2>Description</h2>
          <p className="preserve-lines detail-copy">
            {project.description || 'No description added yet.'}
          </p>
        </Card>
      </div>
      <InvoiceSummary invoices={data.invoices.filter((invoice) => invoice.projectId === id)} />
    </>
  );
}
