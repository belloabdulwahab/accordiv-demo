export function clientChoices(clients) {
  return clients.map(client => ({ value: client.id,
    label: client.company ? `${client.contact} — ${client.company}` : client.contact,
    secondary: `${client.email}${client.archived ? ' · Archived, current relationship' : ''}`,
    search: `${client.contact} ${client.company} ${client.email}` }));
}
export function projectChoices(projects, retainedId) {
  const statuses = { planned: 'Planned', in_progress: 'In progress', on_hold: 'On hold', completed: 'Completed', cancelled: 'Cancelled' };
  return projects.map(project => ({ value: project.id, label: project.name,
    secondary: [statuses[project.status], project.startDate && `Start ${project.startDate}`, project.deadline && `Due ${project.deadline}`,
      project.archived && 'Archived', retainedId === project.id && 'Current relationship'].filter(Boolean).join(' · '),
    search: project.name }));
}
