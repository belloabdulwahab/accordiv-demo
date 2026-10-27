import { useWorkspace } from '../hooks/useWorkspace.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderKanban, Plus } from 'lucide-react';
import { Card, EmptyState, PageHeading, SearchInput, StatusBadge } from '../components/ui.jsx';
import { PROJECT_STATUSES } from '../services/recordRules.js';
import { formatDate } from '../utils/date.js';
import { formatMoney } from '../utils/money.js';

export default function Projects() {
  const { data, basePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('');
  const [archive, setArchive] = useState('current');
  const clients = new Map(data.clients.map((client) => [client.id, client]));
  const projects = data.projects
    .filter(
      (project) =>
        (archive === 'all' || project.archived === (archive === 'archived')) &&
        (!clientId || project.clientId === clientId) &&
        (!status || project.status === status) &&
        `${project.name} ${project.description} ${clients.get(project.clientId).name} ${clients.get(project.clientId).contact}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeading
        eyebrow="MAKE SPACE FOR GOOD WORK"
        title="Projects"
        description="From the first idea to the final handover."
      >
        <Link className="app-button button-primary" to={`${basePath}/projects/new`}>
          <Plus size={17} aria-hidden="true" />
          Add project
        </Link>
      </PageHeading>
      <Card>
        <div className="record-toolbar project-toolbar">
          <SearchInput
            id="project-search"
            label="Search projects"
            placeholder="Search projects…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="inline-filter">
            <label htmlFor="project-client-filter">Client</label>
            <select
              id="project-client-filter"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">All clients</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.contact}
                  {client.archived ? ' (archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-filter">
            <label htmlFor="project-status-filter">Status</label>
            <select
              id="project-status-filter"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(PROJECT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-filter">
            <label htmlFor="project-archive-filter">Show</label>
            <select
              id="project-archive-filter"
              value={archive}
              onChange={(event) => setArchive(event.target.value)}
            >
              <option value="current">Not archived</option>
              <option value="archived">Archived</option>
              <option value="all">All projects</option>
            </select>
          </div>
        </div>
        {projects.length ? (
          <ul className="record-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link className="record-list-link" to={`${basePath}/projects/${project.id}`}>
                  <span className="project-list-icon">
                    <FolderKanban size={20} aria-hidden="true" />
                  </span>
                  <div className="record-list-primary">
                    <strong>{project.name}</strong>
                    <span>
                      {clients.get(project.clientId).name}
                      {clients.get(project.clientId).archived ? ' · Archived client' : ''}
                    </span>
                    <span>
                      {project.deadline
                        ? `Due ${formatDate(project.deadline, { year: 'numeric' })}`
                        : 'No deadline set'}
                    </span>
                  </div>
                  <div className="record-list-meta">
                    <StatusBadge status={project.status} />
                    <span>{formatMoney(project.fee)} agreed fee</span>
                    {project.archived && <span className="record-state is-archived">Archived</span>}
                  </div>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FolderKanban} title="No projects to show">
            Try another search or filter, or add a project for an active client.
          </EmptyState>
        )}
        <div className="table-footer">
          Showing {projects.length} of {data.projects.length} projects
        </div>
      </Card>
    </>
  );
}
