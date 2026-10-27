// v1 had no fees or lifecycle timestamps. Retain IDs, financial records and dates.
export function upgradeDemoData(data) {
  const timestamp = `${data.createdOn}T00:00:00.000Z`;
  return {
    ...data,
    version: 2,
    clients: data.clients.map((client) => ({
      ...client,
      company: client.name,
      phone: '',
      address: '',
      notes: '',
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    projects: data.projects.map((project) => ({
      ...project,
      status: { active: 'in_progress', paused: 'on_hold', completed: 'completed' }[project.status],
      description: '',
      fee: 0,
      startDate: '',
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
  };
}
