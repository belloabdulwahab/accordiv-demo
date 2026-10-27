import { useWorkspace } from '../hooks/useWorkspace.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus, UsersRound } from 'lucide-react';
import { Card, EmptyState, PageHeading, SearchInput } from '../components/ui.jsx';

export default function Clients() {
  const { data, basePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const clients = data.clients
    .filter(
      (client) =>
        (filter === 'all' || client.archived === (filter === 'archived')) &&
        `${client.contact} ${client.company} ${client.email}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeading
        eyebrow="YOUR PEOPLE"
        title="Clients"
        description="Good relationships start with the details."
      >
        <Link className="app-button button-primary" to={`${basePath}/clients/new`}>
          <Plus size={17} aria-hidden="true" />
          Add client
        </Link>
      </PageHeading>
      <Card>
        <div className="record-toolbar">
          <SearchInput
            id="client-search"
            label="Search clients by name, company or email"
            placeholder="Search name, company or email…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="inline-filter">
            <label htmlFor="client-archive-filter">Show</label>
            <select
              id="client-archive-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="active">Active clients</option>
              <option value="archived">Archived clients</option>
              <option value="all">All clients</option>
            </select>
          </div>
        </div>
        {clients.length ? (
          <ul className="record-list">
            {clients.map((client) => (
              <li key={client.id}>
                <Link to={`${basePath}/clients/${client.id}`} className="record-list-link">
                  <span className={`client-avatar avatar-${client.color}`} aria-hidden="true">
                    {client.initials}
                  </span>
                  <div className="record-list-primary">
                    <strong>{client.name}</strong>
                    <span>{client.company ? client.contact : 'Independent contact'}</span>
                    <span>{client.email}</span>
                  </div>
                  <div className="record-list-meta">
                    <span className={`record-state ${client.archived ? 'is-archived' : ''}`}>
                      {client.archived ? 'Archived' : 'Active'}
                    </span>
                    <span>
                      {data.projects.filter((project) => project.clientId === client.id).length}{' '}
                      linked projects
                    </span>
                  </div>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={UsersRound} title="No clients to show">
            {query || filter !== 'active'
              ? 'Try another search or change the filter.'
              : 'Add your first client to start organising your work.'}
          </EmptyState>
        )}
        <div className="table-footer">
          Showing {clients.length} of {data.clients.length} clients
        </div>
      </Card>
    </>
  );
}
