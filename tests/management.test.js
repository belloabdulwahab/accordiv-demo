import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyDemoData } from './fixtures/legacyDemoData.js';
import { createDemoData } from '../src/data/createDemoData.js';
import {
  createDemoRepository,
  DEMO_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from '../src/services/demoRepository.js';
import { isValidDemoData } from '../src/services/demoValidation.js';
import { dashboardSummary } from '../src/services/finance.js';
import {
  isActiveProject,
  validateClientInput,
  validateProjectInput,
} from '../src/services/recordRules.js';
import { formatMoney, moneyInputValue, parseMoneyInput } from '../src/utils/money.js';

const today = '2026-10-01';
const seed = () => createDemoData(today);
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const clientInput = {
  contact: ' Taylor Okeke ',
  company: ' Daylight Studio ',
  email: ' taylor@example.com ',
  phone: ' 08012345678 ',
  address: ' 12 Fictional Lane ',
  notes: ' First conversation ',
};
const projectInput = {
  name: ' New website ',
  clientId: 'client-1',
  description: ' A thoughtful website ',
  fee: '1234.56',
  startDate: '2025-01-01',
  deadline: '2025-02-01',
  status: 'planned',
};
const editValues = (project) => ({ ...project, fee: moneyInputValue(project.fee) });
function setup(storage = memoryStorage()) {
  let counter = 0;
  const repository = createDemoRepository(() => storage, seed, {
    now: () => '2026-10-01T10:30:00.000Z',
    makeId: () => `test-${++counter}`,
  });
  return { repository, storage };
}
function legacySeed() {
  const data = createLegacyDemoData(today);
  return {
    ...data,
    version: 1,
    clients: data.clients.map(({ id, name, contact, email, initials, color }) => ({
      id,
      name,
      contact,
      email,
      initials,
      color,
    })),
    projects: data.projects.map(({ id, name, clientId, deadline, progress, status }) => ({
      id,
      name,
      clientId,
      deadline,
      progress,
      status: { in_progress: 'active', completed: 'completed', on_hold: 'paused' }[status],
    })),
  };
}

test('client create/edit trims fields, preserves Nigerian phone zeroes and retains ID/created timestamp', () => {
  const { repository } = setup();
  const created = repository.saveClient(clientInput);
  assert.equal(created.ok, true);
  assert.equal(created.record.name, 'Daylight Studio');
  assert.equal(created.record.contact, 'Taylor Okeke');
  assert.equal(created.record.phone, '08012345678');
  assert.equal(created.record.notes, 'First conversation');
  const edited = repository.saveClient(
    { ...clientInput, company: '', contact: 'Taylor Updated', email: 'taylor@fictional.test' },
    created.record.id,
  );
  assert.equal(edited.ok, true);
  assert.equal(edited.record.name, 'Taylor Updated');
  assert.equal(edited.record.id, created.record.id);
  assert.equal(edited.record.createdAt, created.record.createdAt);
  assert.ok(isValidDemoData(edited.snapshot.data));
});

test('duplicate emails are rejected case-insensitively, including archived clients; same company allowed', () => {
  const { repository } = setup();
  const client = repository.saveClient(clientInput).record;
  const before = repository.getSnapshot().data;
  const duplicate = repository.saveClient({ ...clientInput, email: 'TAYLOR@EXAMPLE.COM' });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.errors.email, /already exists/);
  assert.deepEqual(repository.getSnapshot().data, before);
  assert.equal(repository.saveClient({ ...clientInput, contact: 'Separate contact', email: 'other@example.com' }).ok, true);
  repository.setClientArchived(client.id, true);
  assert.equal(repository.saveClient(clientInput).ok, false);
  assert.equal(repository.saveClient(clientInput, client.id).ok, true);
  assert.equal(
    repository.saveClient({ ...clientInput, email: 'ADA@BLOOM.EXAMPLE.COM' }, client.id).ok,
    false,
  );
});

test('field validation rejects wrong types, missing required values and overlong input', () => {
  const { errors } = validateClientInput(
    { contact: ' ', email: 'bad', company: 'x'.repeat(201), notes: 'x'.repeat(3001), phone: {} },
    [],
  );
  for (const field of ['contact', 'email', 'company', 'notes', 'phone']) assert.ok(errors[field]);
  const { repository } = setup();
  assert.equal(repository.saveClient(null).ok, false);
  assert.equal(repository.saveProject([]).ok, false);
  assert.equal(repository.saveClient(clientInput, 'missing').ok, false);
  assert.equal(repository.saveProject(projectInput, 'missing').ok, false);
});

test('money conversion is exact, rejects unsupported syntax/precision and enforces safe integer range', () => {
  assert.equal(parseMoneyInput('0'), 0);
  assert.equal(parseMoneyInput(' 0.01 '), 1);
  assert.equal(parseMoneyInput('1234.5'), 123450);
  assert.equal(parseMoneyInput('90071992547409.91'), Number.MAX_SAFE_INTEGER);
  assert.equal(moneyInputValue(Number.MAX_SAFE_INTEGER), '90071992547409.91');
  assert.match(formatMoney(Number.MAX_SAFE_INTEGER), /90,071,992,547,409\.91/);
  for (const value of [
    '',
    '-1',
    '1.234',
    '1e3',
    'NaN',
    'Infinity',
    '1,000',
    '.50',
    '1.',
    '90071992547409.92',
    12.34,
  ])
    assert.throws(() => parseMoneyInput(value));
});

test('projects allow optional and past dates but reject invalid dates and reversed ranges', () => {
  const clients = seed().clients;
  assert.deepEqual(validateProjectInput(projectInput, clients).errors, {});
  assert.deepEqual(
    validateProjectInput({ ...projectInput, startDate: '', deadline: '' }, clients).errors,
    {},
  );
  assert.ok(
    validateProjectInput({ ...projectInput, deadline: '2024-12-31' }, clients).errors.deadline,
  );
  assert.ok(
    validateProjectInput({ ...projectInput, startDate: '2026-02-30' }, clients).errors.startDate,
  );
  assert.ok(validateProjectInput({ ...projectInput, status: 'unknown' }, clients).errors.status);
  assert.ok(validateProjectInput({ ...projectInput, fee: '0.001' }, clients).errors.fee);
});

test('project creation/editing changes dashboard counts/deadlines while invoices and payments stay untouched', () => {
  const { repository } = setup();
  const before = repository.getSnapshot().data;
  const created = repository.saveProject(projectInput);
  assert.equal(created.ok, true);
  assert.equal(created.record.fee, 123456);
  assert.equal(created.record.name, 'New website');
  assert.equal(dashboardSummary(created.snapshot.data, today).activeProjects, 4);
  for (const status of ['in_progress', 'on_hold', 'completed', 'cancelled', 'planned']) {
    const result = repository.saveProject(
      { ...projectInput, name: 'Changed title', status, deadline: '2027-01-01', fee: '500.01' },
      created.record.id,
    );
    assert.equal(result.ok, true);
    assert.equal(result.record.deadline, '2027-01-01');
    assert.equal(
      dashboardSummary(result.snapshot.data, today).activeProjects,
      ['completed', 'cancelled'].includes(status) ? 3 : 4,
    );
    assert.deepEqual(result.snapshot.data.invoices, before.invoices);
    assert.deepEqual(result.snapshot.data.payments, before.payments);
    assert.equal(dashboardSummary(result.snapshot.data, today).received, 65000000);
  }
});

test('client archival preserves history, blocks new assignment, and permits deliberate reassignment of existing projects', () => {
  const { repository } = setup();
  const before = repository.getSnapshot().data;
  const archived = repository.setClientArchived('client-1', true);
  assert.equal(archived.ok, true);
  assert.deepEqual(archived.snapshot.data.projects, before.projects);
  assert.deepEqual(archived.snapshot.data.invoices, before.invoices);
  assert.deepEqual(archived.snapshot.data.payments, before.payments);
  assert.equal(repository.saveProject(projectInput).ok, false);
  const project = before.projects.find((record) => record.clientId === 'client-1');
  assert.equal(
    repository.saveProject(
      { ...editValues(project), name: 'Archived relationship retained' },
      project.id,
    ).ok,
    true,
  );
  const reassigned = repository.saveProject(
    { ...editValues(project), clientId: 'client-2' },
    project.id,
  );
  assert.equal(reassigned.ok, true);
  assert.deepEqual(reassigned.snapshot.data.invoices, before.invoices);
  assert.equal(repository.saveProject(editValues(project), project.id).ok, false);
  assert.equal(repository.setClientArchived('client-1', false).ok, true);
  assert.equal(repository.saveProject(projectInput).ok, true);
});

test('project archive/restore preserves status and financial relationships and changes active counts', () => {
  const { repository } = setup();
  const before = repository.getSnapshot().data;
  const archived = repository.setProjectArchived('project-1', true);
  assert.equal(archived.ok, true);
  assert.equal(archived.record.status, 'in_progress');
  assert.equal(isActiveProject(archived.record), false);
  assert.equal(dashboardSummary(archived.snapshot.data, today).activeProjects, 2);
  assert.deepEqual(archived.snapshot.data.invoices, before.invoices);
  assert.deepEqual(archived.snapshot.data.payments, before.payments);
  assert.equal(repository.setProjectArchived('project-1', false).record.status, 'in_progress');
  assert.equal(repository.setProjectArchived('missing', true).ok, false);
  assert.equal(repository.setClientArchived('client-1', 'true').ok, false);
});

test('migration preserves valid legacy edits, IDs and finances and maps statuses without reseeding', () => {
  const store = memoryStorage();
  const legacy = legacySeed();
  legacy.clients[0].name = 'Legacy custom studio';
  legacy.projects[0].status = 'paused';
  legacy.projects[0].deadline = '2027-05-05';
  store.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
  const { repository } = setup(store);
  const migrated = repository.getSnapshot();
  assert.equal(migrated.data.version, 3);
  assert.equal(migrated.data.clients[0].company, 'Legacy custom studio');
  assert.equal(migrated.data.projects[0].status, 'on_hold');
  assert.equal(migrated.data.projects[0].fee, 0);
  assert.equal(migrated.data.projects[0].deadline, '2027-05-05');
  assert.deepEqual(
    migrated.data.invoices.map(({ id, number, items }) => ({ id, number, items })),
    legacy.invoices.map(({ id, number, items }) => ({ id, number, items })),
  );
  assert.deepEqual(
    migrated.data.payments.map(({ id, invoiceId, amount, date }) => ({
      id,
      invoiceId,
      amount,
      date,
    })),
    legacy.payments,
  );
  assert.deepEqual(
    migrated.data.clients.map((client) => client.id),
    legacy.clients.map((client) => client.id),
  );
  assert.equal(store.getItem(LEGACY_STORAGE_KEY), null);
  assert.ok(isValidDemoData(JSON.parse(store.getItem(DEMO_STORAGE_KEY))));
});

test('legacy duplicate emails survive migration; new duplicate writes are refused', () => {
  const store = memoryStorage();
  const legacy = legacySeed();
  legacy.clients[1].email = legacy.clients[0].email;
  store.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
  const { repository } = setup(store);
  assert.equal(repository.getSnapshot().data.clients[1].email, legacy.clients[0].email);
  assert.equal(repository.saveClient({ ...clientInput, email: legacy.clients[0].email }).ok, false);
});

test('all mutations persist across refresh; reset restores full workspace and stale IDs fail safely', () => {
  const { repository, storage } = setup();
  const client = repository.saveClient(clientInput).record;
  const project = repository.saveProject({ ...projectInput, clientId: client.id }).record;
  repository.setProjectArchived(project.id, true);
  const refreshed = setup(storage).repository;
  assert.equal(
    refreshed.getSnapshot().data.projects.find((record) => record.id === project.id).archived,
    true,
  );
  assert.equal(
    refreshed.getSnapshot().data.clients.find((record) => record.id === client.id).phone,
    '08012345678',
  );
  assert.deepEqual(refreshed.reset().data, seed());
  assert.deepEqual(setup(storage).repository.getSnapshot().data, seed());
  assert.equal(refreshed.saveClient(clientInput, client.id).ok, false);
});

test('storage quota failure retains the latest mutations in memory and reports that reload may lose them', () => {
  const store = memoryStorage();
  const { repository } = setup(store);
  repository.getSnapshot();
  store.setItem = () => {
    throw new Error('Quota exceeded');
  };
  const result = repository.saveClient(clientInput);
  assert.equal(result.ok, true);
  assert.match(result.snapshot.notice, /in memory only/);
  assert.equal(repository.getSnapshot().data.clients.length, 5);
  assert.equal(repository.reset().data.clients.length, 4);
});

test('separate visitor stores and returned snapshots remain isolated', () => {
  const first = setup().repository;
  const second = setup().repository;
  const created = first.saveClient(clientInput);
  created.record.contact = 'Tampered';
  created.snapshot.data.clients[0].name = 'Tampered';
  assert.equal(first.getSnapshot().data.clients[0].name, 'Bloom Studio');
  assert.equal(second.getSnapshot().data.clients.length, 4);
});

test('successful persistence after a quota failure clears the temporary-storage warning', () => {
  const store = memoryStorage();
  const write = store.setItem;
  const { repository } = setup(store);
  repository.getSnapshot();
  store.setItem = () => {
    throw new Error('Quota exceeded');
  };
  repository.saveClient(clientInput);
  store.setItem = write;
  const result = repository.saveProject(projectInput);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.notice, '');
  assert.equal(setup(store).repository.getSnapshot().data.clients.length, 5);
});

test('impossible lifecycle timestamps and missing project relationships are rejected', () => {
  const badTimestamp = seed();
  badTimestamp.clients[0].createdAt = '2026-02-30T00:00:00.000Z';
  assert.equal(isValidDemoData(badTimestamp), false);
  const brokenProject = seed();
  brokenProject.projects[0].clientId = 'unknown';
  assert.equal(isValidDemoData(brokenProject), false);
});
