import { possibleDuplicateReview } from './identityRules.js';
import { createDemoData } from '../data/createDemoData.js';
import { isValidDemoData } from './demoValidation.js';
import { migrateDemoData } from './demoMigration.js';
import { createBillingCommands } from './billingCommands.js';
import { todayDate } from '../utils/date.js';
import { validateSettings } from './settingsRules.js';
import { validateClientInput, validateProjectInput } from './recordRules.js';

export const DEMO_STORAGE_KEY = 'accordiv.demo.v3';
export const PREVIOUS_STORAGE_KEY = 'accordiv.demo.v2';
export const LEGACY_STORAGE_KEY = 'accordly.demo.v1';
const uniqueId = () =>
  globalThis.crypto.randomUUID?.() ||
  [...globalThis.crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
const failure = (message, errors = {}) => ({ ok: false, message, errors });

/**
 * Owns one tab's temporary demo state; it never reads or imports owner records.
 * Storage is accessed lazily so denied access can fall back to memory.
 * @param {Function} getStorage Returns the tab's storage adapter.
 * @param {Function} seed Creates fictional samples for first use or reset.
 * @param {object} options Optional clock, calendar and ID providers for deterministic tests.
 */
export function createDemoRepository(
  getStorage = () => window.sessionStorage,
  seed = createDemoData,
  options = {},
) {
  let memory;
  let notice = '';
  const now = options.now || (() => new Date().toISOString());
  const makeId = options.makeId || uniqueId;
  // Callers receive copies so forms and commands cannot mutate repository state before validation.
  const snapshot = () => ({ data: structuredClone(memory), notice });

  function persist(data) {
    // Keep a valid change usable even if quota or browser policy prevents persistence.
    memory = data;
    try {
      const storage = getStorage();
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
      // Retire prior keys only after a successful v3 write.
      storage.removeItem?.(PREVIOUS_STORAGE_KEY);
      storage.removeItem?.(LEGACY_STORAGE_KEY);
      if (notice.startsWith('Browser storage is unavailable.')) notice = '';
    } catch {
      notice =
        'Browser storage is unavailable. Changes remain in memory only; refreshing may restore older data or reset this demo.';
    }
    return snapshot();
  }

  function getSnapshot() {
    if (memory) return snapshot();
    try {
      const storage = getStorage();
      const raw =
        storage.getItem(DEMO_STORAGE_KEY) ??
        storage.getItem(PREVIOUS_STORAGE_KEY) ??
        storage.getItem(LEGACY_STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        const migrated = migrateDemoData(parsed);
        if (migrated) {
          if (parsed.version === 3) {
            memory = migrated;
            return snapshot();
          }
          notice =
            'Your existing demo has been upgraded to Accordiv’s invoice workspace. Records and balances were preserved; historical billing details were reconstructed from available client records.';
          return persist(migrated);
        }
        notice = 'Your saved demo was invalid or unsupported. Fresh sample data has been restored.';
      }
    } catch {
      notice = 'Saved demo data could not be read. Fresh sample data has been restored.';
    }
    return persist(seed());
  }

  function commit(collection, record, create) {
    const next = structuredClone(memory);
    if (create) next[collection].push(record);
    else next[collection] = next[collection].map((item) => (item.id === record.id ? record : item));
    return commitData(next, record);
  }

  // Validate relationships and aggregate limits before publishing the entire candidate workspace.
  function commitData(next, record) {
    if (!isValidDemoData(next))
      return failure(
        'The change could not be saved: check record relationships, the 1,000-record limit and the safe financial total limit.',
      );
    return { ok: true, record: structuredClone(record), snapshot: persist(next) };
  }

  function save(collection, input, id, confirmation) {
    getSnapshot();
    if (!input || typeof input !== 'object' || Array.isArray(input))
      return failure('Enter valid record details.');
    const existing =
      id === undefined ? undefined : memory[collection].find((item) => item.id === id);
    if (id !== undefined && !existing)
      return failure('This record no longer exists. It may have been removed by a demo reset.');
    if (!existing && memory[collection].length >= 1000)
      return failure('This demo supports up to 1,000 records of each type.');
    const { value, errors } =
      collection === 'clients'
        ? validateClientInput(input, memory.clients, id)
        : validateProjectInput(input, memory.clients, existing);
    if (Object.keys(errors).length) return failure('Please check the highlighted fields.', errors);
    const review = possibleDuplicateReview(memory, collection, value, existing);
    if (review && confirmation !== review.token) return { ok: false, code: 'duplicate_review', message: 'Review these possible matches before saving a separate record.', review, errors: {} };
    const timestamp = now();
    const record = {
      ...existing,
      ...value,
      updatedAt: existing && existing.updatedAt > timestamp ? existing.updatedAt : timestamp,
    };
    if (!existing) {
      let candidate;
      for (let attempt = 0; attempt < 5; attempt++) {
        candidate = `${collection === 'clients' ? 'client' : 'project'}-${makeId()}`;
        if (!memory[collection].some((item) => item.id === candidate)) break;
      }
      record.id = candidate;
      record.createdAt = timestamp;
      record.archived = false;
      if (collection === 'clients')
        record.color = ['violet', 'blue', 'orange', 'green'][memory.clients.length % 4];
    }
    if (collection === 'projects')
      record.progress =
        value.status === 'completed'
          ? 100
          : existing?.status === 'completed'
            ? 0
            : existing?.progress || 0;
    return commit(collection, record, !existing);
  }

  function archive(collection, id, archived) {
    getSnapshot();
    const record = memory[collection].find((item) => item.id === id);
    if (!record)
      return failure('This record no longer exists. It may have been removed by a demo reset.');
    if (typeof archived !== 'boolean') return failure('Choose archive or restore.');
    return commit(
      collection,
      { ...record, archived, updatedAt: [now(), record.updatedAt].sort().at(-1) },
      false,
    );
  }

  return {
    ...createBillingCommands({
      read: () => getSnapshot().data,
      commit: commitData,
      now,
      today: options.today || todayDate,
      makeId,
    }),
    getSnapshot,
    saveSettings(input) {
      const next = getSnapshot().data;
      const { value, errors } = validateSettings(input, next.settings);
      if (Object.keys(errors).length)
        return failure('Please check the highlighted settings.', errors);
      next.settings = value;
      return commitData(next, value);
    },
    reset() {
      notice = '';
      return persist(seed());
    },
    saveClient: (input, id, confirmation) => save('clients', input, id, confirmation),
    saveProject: (input, id, confirmation) => save('projects', input, id, confirmation),
    setClientArchived: (id, archived) => archive('clients', id, archived),
    setProjectArchived: (id, archived) => archive('projects', id, archived),
  };
}
