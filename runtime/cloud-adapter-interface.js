/**
 * Sprint-07 Cloud Adapter Interface
 * GitHub / Firebase — Interface only. No network, no credentials, no sync.
 * Future adapters must implement this contract without changing SoT DBs.
 */

import { createAdapterSkeleton, SYNC_STATE_KEYS } from './storage-adapter.js';

/**
 * @typedef {import('./storage-adapter.js').StorageAdapter} StorageAdapter
 */

/**
 * @typedef {object} CloudAdapterCapabilities
 * @property {boolean} push
 * @property {boolean} pull
 * @property {boolean} realtime
 * @property {boolean} auth
 */

/**
 * @typedef {StorageAdapter & {
 *   capabilities: CloudAdapterCapabilities,
 *   connect: () => Promise<{ ok: boolean, error?: string }>,
 *   disconnect: () => Promise<void>,
 *   pushStudyState: (bundle: object) => Promise<{ ok: boolean, error?: string }>,
 *   pullStudyState: () => Promise<{ ok: boolean, data?: object, error?: string }>,
 * }} CloudAdapter
 */

/**
 * Shared stub behaviour for unimplemented cloud backends.
 * @param {AdapterKind} kind
 * @param {string} name
 * @returns {CloudAdapter}
 */
function createUnimplementedCloudAdapter(kind, name) {
  const notReady = (op) => ({
    ok: false,
    error: `${name}: ${op} not implemented (Sprint-07 interface only)`,
  });

  const base = createAdapterSkeleton({
    kind,
    name,
    isAvailable() {
      return false;
    },
    get() {
      return null;
    },
    set() {
      return false;
    },
    remove() {},
    getMany(keys) {
      const out = {};
      for (const k of keys) out[k] = null;
      return out;
    },
    setMany() {
      return false;
    },
  });

  return {
    ...base,
    kind,
    name,
    capabilities: {
      push: false,
      pull: false,
      realtime: false,
      auth: false,
    },
    async connect() {
      return notReady('connect');
    },
    async disconnect() {},
    async pushStudyState() {
      return notReady('pushStudyState');
    },
    async pullStudyState() {
      return notReady('pullStudyState');
    },
  };
}

/** Future: GitHub Gist / private repo sync */
export function createGitHubAdapterInterface() {
  return createUnimplementedCloudAdapter('github', 'GitHubAdapter');
}

/** Future: Firebase Auth + Firestore sync */
export function createFirebaseAdapterInterface() {
  return createUnimplementedCloudAdapter('firebase', 'FirebaseAdapter');
}

/**
 * Registry of cloud adapter factories (interface only).
 */
export const CLOUD_ADAPTER_REGISTRY = Object.freeze({
  github: createGitHubAdapterInterface,
  firebase: createFirebaseAdapterInterface,
});

export { SYNC_STATE_KEYS };

export default {
  createGitHubAdapterInterface,
  createFirebaseAdapterInterface,
  CLOUD_ADAPTER_REGISTRY,
};
