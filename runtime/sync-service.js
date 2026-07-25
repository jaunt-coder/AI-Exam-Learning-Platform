/**
 * Sprint-07 Sync Service — Study State Sync Layer
 * Local First: LocalStorage → (future Cloud) → Merge → UI
 * No AI · No Recommendation · No Mastery · SoT DBs read-only.
 */

import { getItem, setItem } from '../js/storage.js';
import {
  SYNC_STATE_KEYS,
  APPEND_ONLY_KEYS,
} from './storage-adapter.js';
import { createLocalStorageAdapter } from './local-storage-adapter.js';

export const SYNC_SCHEMA = 'learning.sync.v1';
export const SYNC_META_KEY = 'learning.sync.meta.v1';
export const PROGRESS_KEY = 'learning.progress.v1';
export const SYNC_VERSION = '1.0.0';

/** @type {import('./storage-adapter.js').StorageAdapter} */
let activeAdapter = createLocalStorageAdapter();

/**
 * @returns {object}
 */
export function emptySyncMeta() {
  return {
    schema: SYNC_SCHEMA,
    sync_version: SYNC_VERSION,
    revision: 0,
    updated_at: null,
    dirty: false,
    last_export_at: null,
    last_import_at: null,
    last_conflict: null,
    adapter: activeAdapter?.kind || 'local',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

/**
 * @returns {object}
 */
export function emptyProgress() {
  return {
    schema: 'learning.progress.v1',
    student_id: 'm1_demo_student',
    updated_at: null,
    revision: 0,
    last_pattern_id: null,
    patterns_touched: [],
    resume: null,
  };
}

/**
 * @param {import('./storage-adapter.js').StorageAdapter} adapter
 */
export function setAdapter(adapter) {
  if (adapter) activeAdapter = adapter;
}

export function getAdapter() {
  return activeAdapter;
}

export function version() {
  const meta = loadMeta();
  return {
    sync_version: SYNC_VERSION,
    revision: meta.revision || 0,
    updated_at: meta.updated_at,
    adapter: activeAdapter?.kind || 'local',
  };
}

export function loadMeta() {
  return getItem(SYNC_META_KEY, emptySyncMeta()) || emptySyncMeta();
}

function saveMeta(patch) {
  const cur = loadMeta();
  const next = {
    ...cur,
    ...patch,
    sync_version: SYNC_VERSION,
    adapter: activeAdapter?.kind || 'local',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
  setItem(SYNC_META_KEY, next);
  return next;
}

/**
 * Collect Study State snapshot from active adapter (Local First).
 * @returns {Promise<{ ok: boolean, bundle?: object, error?: string }>}
 */
export async function load() {
  try {
    if (!(await Promise.resolve(activeAdapter.isAvailable()))) {
      return { ok: false, error: 'adapter_unavailable' };
    }
    const data = await Promise.resolve(
      activeAdapter.getMany([...SYNC_STATE_KEYS])
    );
    ensureProgressShape(data);
    return {
      ok: true,
      bundle: {
        schema: SYNC_SCHEMA,
        export_version: '4.0',
        collected_at: new Date().toISOString(),
        adapter: activeAdapter.kind,
        keys: data,
      },
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'load_failed' };
  }
}

/**
 * Persist Study State keys via adapter. Marks dirty for future cloud push.
 * @param {Record<string, *>} [entries]
 * @returns {Promise<{ ok: boolean, revision?: number, error?: string }>}
 */
export async function save(entries) {
  try {
    if (!(await Promise.resolve(activeAdapter.isAvailable()))) {
      return { ok: false, error: 'adapter_unavailable' };
    }
    const payload = entries || (await collectLocalEntries());
    const ok = await Promise.resolve(activeAdapter.setMany(payload));
    if (!ok) return { ok: false, error: 'save_failed' };
    const meta = loadMeta();
    const revision = (meta.revision || 0) + 1;
    saveMeta({
      revision,
      updated_at: new Date().toISOString(),
      dirty: true,
    });
    return { ok: true, revision };
  } catch (err) {
    return { ok: false, error: err?.message || 'save_failed' };
  }
}

/**
 * Bump revision after local study mutations (Local First enqueue).
 * @returns {{ ok: boolean, revision: number }}
 */
export function touchLocal() {
  const meta = loadMeta();
  const revision = (meta.revision || 0) + 1;
  saveMeta({
    revision,
    updated_at: new Date().toISOString(),
    dirty: true,
  });
  return { ok: true, revision };
}

/**
 * Merge remote/imported bundle into local. Conflict policy applied.
 * @param {object} incoming — { keys: Record } or full sync-state package
 * @returns {{ ok: boolean, merged?: object, conflicts?: object[], error?: string }}
 */
export function merge(incoming) {
  try {
    const remoteKeys = normalizeIncomingKeys(incoming);
    if (!remoteKeys) return { ok: false, error: 'invalid_bundle' };

    const localKeys = {};
    for (const k of SYNC_STATE_KEYS) {
      localKeys[k] = getItem(k, null);
    }

    const conflicts = [];
    const merged = {};

    for (const key of SYNC_STATE_KEYS) {
      const localVal = localKeys[key];
      const remoteVal = remoteKeys[key];
      const result = mergeKey(key, localVal, remoteVal);
      merged[key] = result.value;
      if (result.conflict) {
        conflicts.push({
          key,
          policy: result.policy,
          detail: result.detail || 'conflict_resolved',
        });
      }
    }

    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined) setItem(k, v);
    }

    const meta = loadMeta();
    const revision = Math.max(meta.revision || 0, remoteKeys[SYNC_META_KEY]?.revision || 0) + 1;
    saveMeta({
      revision,
      updated_at: new Date().toISOString(),
      dirty: false,
      last_import_at: new Date().toISOString(),
      last_conflict: conflicts.length ? conflicts[0] : null,
    });

    return { ok: true, merged, conflicts };
  } catch (err) {
    return { ok: false, error: err?.message || 'merge_failed' };
  }
}

/**
 * Detect conflicts without writing.
 * @param {object} incoming
 * @returns {{ ok: boolean, conflicts: object[] }}
 */
export function detectConflicts(incoming) {
  const remoteKeys = normalizeIncomingKeys(incoming);
  if (!remoteKeys) return { ok: false, conflicts: [] };
  const conflicts = [];
  for (const key of SYNC_STATE_KEYS) {
    const localVal = getItem(key, null);
    const remoteVal = remoteKeys[key];
    const result = mergeKey(key, localVal, remoteVal);
    if (result.conflict) {
      conflicts.push({ key, policy: result.policy, detail: result.detail });
    }
  }
  return { ok: true, conflicts };
}

/**
 * Cloud Ready / Local / Offline / Sync Pending status (no real cloud push).
 * @returns {{ status: string, label: string, online: boolean, dirty: boolean, adapter: string, revision: number }}
 */
export function getSyncStatus() {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const meta = loadMeta();
  const dirty = Boolean(meta.dirty);
  const adapter = activeAdapter?.kind || 'local';

  let status = 'local_mode';
  let label = 'Local Mode';

  if (!online) {
    status = 'offline';
    label = 'Offline';
  } else if (dirty) {
    status = 'sync_pending';
    label = 'Sync Pending';
  } else if (adapter === 'local') {
    status = 'cloud_ready';
    label = 'Cloud Ready';
  }

  return {
    status,
    label,
    online,
    dirty,
    adapter,
    revision: meta.revision || 0,
    sync_version: SYNC_VERSION,
  };
}

/**
 * Ensure learning.progress.v1 exists (WP-01).
 */
export function ensureProgress() {
  const cur = getItem(PROGRESS_KEY, null);
  if (cur && cur.schema === 'learning.progress.v1') return cur;
  const next = emptyProgress();
  next.updated_at = new Date().toISOString();
  setItem(PROGRESS_KEY, next);
  return next;
}

/**
 * Update resume snapshot inside learning.progress.v1
 * @param {object|null} resume
 * @param {object} [extra]
 */
export function saveProgressResume(resume, extra = {}) {
  const cur = ensureProgress();
  const next = {
    ...cur,
    ...extra,
    resume: resume || null,
    updated_at: new Date().toISOString(),
    revision: (cur.revision || 0) + 1,
  };
  if (resume?.pattern_id) {
    const set = new Set(next.patterns_touched || []);
    set.add(resume.pattern_id);
    next.patterns_touched = [...set];
    next.last_pattern_id = resume.pattern_id;
  }
  setItem(PROGRESS_KEY, next);
  touchLocal();
  return next;
}

export function clearProgressResume() {
  return saveProgressResume(null);
}

export function getProgress() {
  return ensureProgress();
}

function ensureProgressShape(data) {
  if (!data[PROGRESS_KEY] || data[PROGRESS_KEY].schema !== 'learning.progress.v1') {
    data[PROGRESS_KEY] = emptyProgress();
  }
}

async function collectLocalEntries() {
  const out = {};
  for (const k of SYNC_STATE_KEYS) {
    out[k] = getItem(k, null);
  }
  if (!out[PROGRESS_KEY]) out[PROGRESS_KEY] = emptyProgress();
  return out;
}

function normalizeIncomingKeys(incoming) {
  if (!incoming || typeof incoming !== 'object') return null;
  if (incoming.keys && typeof incoming.keys === 'object') return incoming.keys;
  if (incoming.study_state && typeof incoming.study_state === 'object') {
    return incoming.study_state;
  }
  /* raw key map */
  const hasAny = SYNC_STATE_KEYS.some((k) => k in incoming);
  if (hasAny) {
    const out = {};
    for (const k of SYNC_STATE_KEYS) out[k] = incoming[k] ?? null;
    return out;
  }
  return null;
}

/**
 * Conflict Policy (WP-04):
 * - Append Only logs: union by id, No Delete
 * - Session / Progress / Meta: Newest Wins by updated_at / startedAt
 */
function mergeKey(key, localVal, remoteVal) {
  if (remoteVal == null || remoteVal === undefined) {
    return { value: localVal, conflict: false, policy: 'keep_local' };
  }
  if (localVal == null || localVal === undefined) {
    return { value: remoteVal, conflict: false, policy: 'take_remote' };
  }

  if (APPEND_ONLY_KEYS.includes(key)) {
    return mergeAppendOnly(key, localVal, remoteVal);
  }

  if (key === 'learning.session.v1') {
    return mergeNewestWins(localVal, remoteVal, [
      'finishedAt',
      'exportedAt',
      'startedAt',
    ]);
  }

  if (key === 'learning.progress.v1' || key === SYNC_META_KEY) {
    return mergeNewestWins(localVal, remoteVal, ['updated_at', 'updatedAt']);
  }

  if (key === 'learning.state.v1') {
    return mergeLearningState(localVal, remoteVal);
  }

  return mergeNewestWins(localVal, remoteVal, ['updated_at', 'updatedAt']);
}

function mergeAppendOnly(key, localVal, remoteVal) {
  if (key === 'learning.attempts.v1') {
    const localEvents = Array.isArray(localVal?.events)
      ? localVal.events
      : Array.isArray(localVal)
        ? localVal
        : [];
    const remoteEvents = Array.isArray(remoteVal?.events)
      ? remoteVal.events
      : Array.isArray(remoteVal)
        ? remoteVal
        : [];
    const map = new Map();
    for (const e of [...localEvents, ...remoteEvents]) {
      const id = e?.event_id || e?.attempt_id || `${e?.question_id}|${e?.timestamp}`;
      if (!id) continue;
      if (!map.has(id)) map.set(id, e);
    }
    const conflict = localEvents.length > 0 && remoteEvents.length > 0;
    return {
      value: {
        schemaVersion: localVal?.schemaVersion || remoteVal?.schemaVersion || '1.0',
        milestone: localVal?.milestone || remoteVal?.milestone || 'M1',
        updatedAt: new Date().toISOString(),
        events: [...map.values()],
      },
      conflict,
      policy: 'append_only_union',
      detail: conflict ? 'attempts_union' : null,
    };
  }

  /* evidence / retrieval — array logs */
  const localArr = Array.isArray(localVal) ? localVal : [];
  const remoteArr = Array.isArray(remoteVal) ? remoteVal : [];
  const map = new Map();
  for (const e of [...localArr, ...remoteArr]) {
    const id =
      e?.evidence_id ||
      e?.retrieval_id ||
      e?.id ||
      `${e?.question_id}|${e?.pattern_id}|${e?.timestamp || e?.created_at}|${e?.memo || e?.student_response || ''}`;
    if (!map.has(id)) map.set(id, e);
  }
  const conflict = localArr.length > 0 && remoteArr.length > 0;
  return {
    value: [...map.values()],
    conflict,
    policy: 'append_only_union',
    detail: conflict ? `${key}_union` : null,
  };
}

function mergeNewestWins(localVal, remoteVal, timeFields) {
  const lt = pickTime(localVal, timeFields);
  const rt = pickTime(remoteVal, timeFields);
  if (lt === rt) {
    /* Prefer richer session (more patterns learned) */
    const lCount = (localVal.patternsLearned || []).length;
    const rCount = (remoteVal.patternsLearned || []).length;
    if (rCount > lCount) {
      return {
        value: mergeSessionFields(localVal, remoteVal),
        conflict: true,
        policy: 'newest_wins_enriched',
        detail: 'remote_richer',
      };
    }
    return {
      value: mergeSessionFields(remoteVal, localVal),
      conflict: lCount !== rCount,
      policy: 'newest_wins_enriched',
    };
  }
  const takeRemote = rt > lt;
  return {
    value: takeRemote
      ? mergeSessionFields(localVal, remoteVal)
      : mergeSessionFields(remoteVal, localVal),
    conflict: true,
    policy: 'newest_wins',
    detail: takeRemote ? 'remote_newer' : 'local_newer',
  };
}

function mergeSessionFields(base, winner) {
  if (!base || typeof base !== 'object') return winner;
  if (!winner || typeof winner !== 'object') return base;
  const learned = [
    ...new Set([
      ...(base.patternsLearned || []),
      ...(winner.patternsLearned || []),
    ]),
  ];
  const reviewed = [
    ...new Set([
      ...(base.patternsReviewed || []),
      ...(winner.patternsReviewed || []),
    ]),
  ];
  if ('patternsLearned' in winner || 'patternsLearned' in base) {
    return {
      ...base,
      ...winner,
      patternsLearned: learned,
      patternsReviewed: reviewed,
    };
  }
  return { ...base, ...winner };
}

function mergeLearningState(localVal, remoteVal) {
  const localStudents = localVal?.students || {};
  const remoteStudents = remoteVal?.students || {};
  const ids = new Set([
    ...Object.keys(localStudents),
    ...Object.keys(remoteStudents),
  ]);
  const students = {};
  let conflict = false;
  for (const id of ids) {
    const L = localStudents[id];
    const R = remoteStudents[id];
    if (!L) students[id] = R;
    else if (!R) students[id] = L;
    else {
      const lt = Date.parse(L.updated_at || '') || 0;
      const rt = Date.parse(R.updated_at || '') || 0;
      if (lt && rt && lt !== rt) conflict = true;
      const newer = rt >= lt ? R : L;
      const older = rt >= lt ? L : R;
      students[id] = {
        ...older,
        ...newer,
        question_history: unionBy(
          older.question_history || [],
          newer.question_history || [],
          (h) => `${h.question_id}|${h.timestamp}`
        ),
        pattern_states: unionBy(
          older.pattern_states || [],
          newer.pattern_states || [],
          (p) => p.pattern_id
        ),
        mastery: { status: 'unknown', confidence: 'unknown' },
        recommendation_state: { next_action: 'unknown' },
      };
    }
  }
  return {
    value: {
      ...localVal,
      ...remoteVal,
      students,
      updatedAt: new Date().toISOString(),
    },
    conflict,
    policy: 'state_merge_newest',
  };
}

function unionBy(a, b, keyFn) {
  const map = new Map();
  for (const item of [...a, ...b]) {
    const k = keyFn(item);
    if (k != null && !map.has(k)) map.set(k, item);
  }
  return [...map.values()];
}

function pickTime(obj, fields) {
  for (const f of fields) {
    const v = obj?.[f];
    if (v == null) continue;
    const n = typeof v === 'number' ? v : Date.parse(String(v));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export { SYNC_STATE_KEYS, APPEND_ONLY_KEYS };

export default {
  SYNC_SCHEMA,
  SYNC_VERSION,
  SYNC_STATE_KEYS,
  APPEND_ONLY_KEYS,
  setAdapter,
  getAdapter,
  version,
  load,
  save,
  merge,
  detectConflicts,
  touchLocal,
  getSyncStatus,
  ensureProgress,
  saveProgressResume,
  clearProgressResume,
  getProgress,
  loadMeta,
};
