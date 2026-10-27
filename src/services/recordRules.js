import { phoneError } from './identityRules.js';
import { isDateOnly } from '../utils/date.js';
import { parseMoneyInput } from '../utils/money.js';

export const DEMO_VERSION = 3;
export const CLIENT_LIMITS = {
  contact: 200,
  company: 200,
  email: 254,
  phone: 50,
  address: 500,
  notes: 3000,
};
export const PROJECT_LIMITS = { name: 200, description: 5000 };
export const PROJECT_STATUSES = {
  planned: 'Planned',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export const isActiveProject = (project) =>
  !project.archived && ['planned', 'in_progress', 'on_hold'].includes(project.status);
export const clientName = (client) => client.company || client.contact;
export const initialsFor = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toUpperCase();
export const validEmail = (value) => /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);

function readText(input, field, limit, errors, required = false) {
  if (input[field] !== undefined && typeof input[field] !== 'string') {
    errors[field] = 'Enter text for this field.';
    return '';
  }
  const value = (input[field] || '').trim();
  if (required && !value) errors[field] = 'This field is required.';
  else if (value.length > limit) errors[field] = `Use ${limit} characters or fewer.`;
  return value;
}

export function validateClientInput(input, clients, id) {
  const errors = {};
  const value = {};
  for (const [field, limit] of Object.entries(CLIENT_LIMITS))
    value[field] = readText(input, field, limit, errors, ['contact', 'email'].includes(field));
  if (value.email && !validEmail(value.email))
    errors.email = 'Enter a valid email address, such as name@example.com.';
  if (
    clients.some(
      (client) => client.id !== id && client.email.toLowerCase() === value.email.toLowerCase(),
    )
  )
    errors.email = 'A client with this email already exists, including archived clients.';
  const existing = clients.find(client => client.id === id);
  const phoneIssue = phoneError(value.phone, existing?.phone, input.phone);
  if (phoneIssue) errors.phone = phoneIssue;
  if (existing && (input.phone === undefined || input.phone === existing.phone)) value.phone = existing.phone;
  value.name = clientName(value);
  value.initials = initialsFor(value.name);
  return { value, errors };
}

// A retained archived client is allowed on edits; a new assignment must use an active client.
export function validateProjectInput(input, clients, existing) {
  const errors = {};
  const value = {
    name: readText(input, 'name', PROJECT_LIMITS.name, errors, true),
    description: readText(input, 'description', PROJECT_LIMITS.description, errors),
    clientId: readText(input, 'clientId', 200, errors, true),
    startDate: readText(input, 'startDate', 10, errors),
    deadline: readText(input, 'deadline', 10, errors),
    status: readText(input, 'status', 30, errors, true),
  };
  const client = clients.find((record) => record.id === value.clientId);
  if (!client || (client.archived && existing?.clientId !== client.id))
    errors.clientId = 'Choose an existing active client.';
  if (!Object.hasOwn(PROJECT_STATUSES, value.status))
    errors.status = 'Choose a valid project status.';
  for (const field of ['startDate', 'deadline'])
    if (value[field] && !isDateOnly(value[field])) errors[field] = 'Enter a valid calendar date.';
  if (
    !errors.startDate &&
    !errors.deadline &&
    value.startDate &&
    value.deadline &&
    value.deadline < value.startDate
  )
    errors.deadline = 'The deadline must be on or after the start date.';
  try {
    value.fee = parseMoneyInput(input.fee);
  } catch (error) {
    errors.fee = error.message;
  }
  return { value, errors };
}
