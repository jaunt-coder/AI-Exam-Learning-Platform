/**
 * Sprint-07 Storage Adapter — common contract for Local / Cloud backends.
 * Student Study State only. Question/Pattern/Knowledge SoT never written here.
 */

/** @typedef {'local'|'github'|'firebase'} AdapterKind */

/**
 * @typedef {object} StorageAdapter
 * @property {AdapterKind} kind
 * @property {string} name
 * @property {() => Promise<boolean>|boolean} isAvailable
 * @property {(key: string, defaultValue?: *) => Promise<*>|*} get
 * @property {(key: string, value: *) => Promise<boolean>|boolean} set
 * @property {(key: string) => Promise<void>|void} remove
 * @property {(keys: string[]) => Promise<Record<string, *>>|Record<string, *>} getMany
 * @property {(entries: Record<string, *>) => Promise<boolean>|boolean} setMany
 */

export const SYNC_STATE_KEYS = Object.freeze([
  'learning.progress.v1',
  'learning.attempts.v1',
  'learning.evidence.v1',
  'learning.retrieval.v1',
  'learning.session.v1',
  'learning.state.v1',
  'learning.sync.meta.v1',
]);

/**
 * Keys that are append-only logs (never delete / never overwrite wholesale without merge).
 */
export const APPEND_ONLY_KEYS = Object.freeze([
  'learning.attempts.v1',
  'learning.evidence.v1',
  'learning.retrieval.v1',
]);

/**
 * @param {Partial<StorageAdapter>} partial
 * @returns {StorageAdapter}
 */
export function createAdapterSkeleton(partial = {}) {
  return {
    kind: partial.kind || 'local',
    name: partial.name || 'unnamed',
    isAvailable:
      partial.isAvailable ||
      (() => false),
    get: partial.get || (() => null),
    set: partial.set || (() => false),
    remove: partial.remove || (() => {}),
    getMany:
      partial.getMany ||
      (async (keys) => {
        const out = {};
        for (const k of keys) out[k] = await Promise.resolve(partial.get?.(k, null));
        return out;
      }),
    setMany:
      partial.setMany ||
      (async (entries) => {
        let ok = true;
        for (const [k, v] of Object.entries(entries || {})) {
          const r = await Promise.resolve(partial.set?.(k, v));
          if (!r) ok = false;
        }
        return ok;
      }),
  };
}

export default {
  SYNC_STATE_KEYS,
  APPEND_ONLY_KEYS,
  createAdapterSkeleton,
};
