import { CLIENT_LIMITS, DEMO_VERSION, PROJECT_STATUSES, validEmail } from './recordRules.js';
import { isDateOnly } from '../utils/date.js';
import { validateLedger } from './ledgerValidation.js';
import { validStoredSettings } from './settingsRules.js';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
const optionalText = (value, limit) => typeof value === 'string' && value.length <= limit;
const timestamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const lifecycle = (record) =>
  typeof record.archived === 'boolean' &&
  timestamp(record.createdAt) &&
  timestamp(record.updatedAt) &&
  record.updatedAt >= record.createdAt;
const records = (value) =>
  Array.isArray(value) &&
  value.length <= 1000 &&
  value.every((record) => object(record) && text(record.id)) &&
  new Set(value.map((record) => record.id)).size === value.length;

// Browser data is untrusted. Validate the entire graph before exposing any record to React.
export function isValidDemoData(data) {
  if (!object(data) || data.version !== DEMO_VERSION || !isDateOnly(data.createdOn)) return false;
  if (!validStoredSettings(data.settings)) return false;
  if (![data.clients, data.projects, data.invoices, data.payments].every(records)) return false;
  if (
    !data.clients.every(
      (client) =>
        text(client.name) &&
        text(client.contact) &&
        optionalText(client.email, CLIENT_LIMITS.email) &&
        validEmail(client.email) &&
        ['company', 'phone', 'address', 'notes'].every((field) =>
          optionalText(client[field], CLIENT_LIMITS[field]),
        ) &&
        lifecycle(client) &&
        text(client.initials) &&
        ['violet', 'blue', 'orange', 'green'].includes(client.color),
    )
  )
    return false;
  const clientIds = new Set(data.clients.map((client) => client.id));
  // Legacy v1 allowed duplicate emails. Preserve that history; all new mutations
  // enforce email uniqueness rather than throwing away an otherwise valid workspace.
  if (
    !data.projects.every(
      (project) =>
        clientIds.has(project.clientId) &&
        text(project.name) &&
        Object.hasOwn(PROJECT_STATUSES, project.status) &&
        optionalText(project.description, 5000) &&
        Number.isSafeInteger(project.fee) &&
        project.fee >= 0 &&
        lifecycle(project) &&
        (project.deadline === '' || isDateOnly(project.deadline)) &&
        (project.startDate === '' || isDateOnly(project.startDate)) &&
        (!project.deadline || !project.startDate || project.deadline >= project.startDate) &&
        Number.isInteger(project.progress) &&
        project.progress >= 0 &&
        project.progress <= 100,
    )
  )
    return false;
  return validateLedger(data);
}
