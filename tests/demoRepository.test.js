import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoData } from '../src/data/createDemoData.js';
import { createDemoRepository, DEMO_STORAGE_KEY } from '../src/services/demoRepository.js';
import { isValidDemoData } from '../src/services/demoValidation.js';

function storage(initial) {
  const values = new Map(initial ? [[DEMO_STORAGE_KEY, initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
const seed = () => createDemoData('2026-10-01');

test('seed passes validation; empty collections are supported', () => {
  assert.ok(isValidDemoData(seed()));
  assert.ok(isValidDemoData({ ...seed(), clients: [], projects: [], invoices: [], payments: [] }));
});

test('refresh preserves valid stored state and reset restores fresh sample records', () => {
  const saved = seed();
  saved.projects[0].name = 'A custom temporary project';
  const store = storage(JSON.stringify(saved));
  const repo = createDemoRepository(() => store, seed);
  assert.equal(repo.getSnapshot().data.projects[0].name, 'A custom temporary project');
  const refreshed = createDemoRepository(() => store, seed);
  assert.equal(refreshed.getSnapshot().data.projects[0].name, 'A custom temporary project');
  refreshed.reset();
  assert.deepEqual(JSON.parse(store.getItem(DEMO_STORAGE_KEY)), seed());
});

test('separate stores are isolated and snapshots cannot mutate repository memory', () => {
  const first = createDemoRepository(() => storage(), seed);
  const second = createDemoRepository(() => storage(), seed);
  const snapshot = first.getSnapshot();
  snapshot.data.clients[0].name = 'Changed';
  assert.equal(first.getSnapshot().data.clients[0].name, 'Bloom Studio');
  assert.equal(second.getSnapshot().data.clients[0].name, 'Bloom Studio');
});

test('missing, malformed, outdated and wrong-shaped data recover safely', () => {
  for (const raw of [
    undefined,
    '{invalid',
    'null',
    '[]',
    JSON.stringify({ ...seed(), version: 0 }),
    JSON.stringify({ ...seed(), clients: [null] }),
  ]) {
    const store = storage(raw);
    const repo = createDemoRepository(() => store, seed);
    assert.deepEqual(repo.getSnapshot().data, seed());
    assert.ok(isValidDemoData(JSON.parse(store.getItem(DEMO_STORAGE_KEY))));
  }
});

test('untrusted invalid relationships, money, dates and statuses are rejected', () => {
  const edits = [
    (data) => {
      data.payments[0].amount = -1;
    },
    (data) => {
      data.payments[0].amount = 1.1;
    },
    (data) => {
      data.payments[0].amount = Number.MAX_SAFE_INTEGER;
    },
    (data) => {
      data.payments[0].invoiceId = 'unknown';
    },
    (data) => {
      data.payments[0].amount = 10000001;
    },
    (data) => {
      data.invoices[0].clientId = 'unknown-client';
    },
    (data) => {
      data.invoices[0].dueDate = '2026-02-31';
    },
    (data) => {
      data.invoices[0].items = [null];
    },
    (data) => {
      data.invoices[0].status = 'paid';
    },
    (data) => {
      data.clients[0].email = 'not-an-email';
    },
    (data) => {
      data.projects[0].progress = 101;
    },
    (data) => {
      data.clients.push(data.clients[0]);
    },
  ];
  for (const edit of edits) {
    const data = seed();
    edit(data);
    assert.equal(isValidDemoData(data), false);
  }
});

test('unavailable and quota-limited storage use memory and explain the limitation', () => {
  for (const getStorage of [
    () => {
      throw new Error('Blocked');
    },
    () => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    }),
  ]) {
    const repo = createDemoRepository(getStorage, seed);
    assert.deepEqual(repo.getSnapshot().data, seed());
    assert.match(repo.getSnapshot().notice, /in memory/);
    assert.deepEqual(repo.reset().data, seed());
  }
});
