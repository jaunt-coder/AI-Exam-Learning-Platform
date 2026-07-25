/**
 * Sprint-07 Local Storage Adapter
 * Local First — primary offline-capable backend.
 */

import { getItem, setItem, removeItem } from '../js/storage.js';
import { createAdapterSkeleton, SYNC_STATE_KEYS } from './storage-adapter.js';

/**
 * @returns {import('./storage-adapter.js').StorageAdapter}
 */
export function createLocalStorageAdapter() {
  return createAdapterSkeleton({
    kind: 'local',
    name: 'LocalStorageAdapter',
    isAvailable() {
      try {
        const k = '__sync_probe__';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch {
        return false;
      }
    },
    get(key, defaultValue = null) {
      return getItem(key, defaultValue);
    },
    set(key, value) {
      return setItem(key, value);
    },
    remove(key) {
      removeItem(key);
    },
    getMany(keys) {
      const out = {};
      for (const k of keys) out[k] = getItem(k, null);
      return out;
    },
    setMany(entries) {
      let ok = true;
      for (const [k, v] of Object.entries(entries || {})) {
        if (!setItem(k, v)) ok = false;
      }
      return ok;
    },
  });
}

export { SYNC_STATE_KEYS };

export default { createLocalStorageAdapter };
