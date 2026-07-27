/**
 * Sprint-14B — Dashboard cache (LocalStorage)
 * Caches rendered view-model only. Does not mutate Learning Engine.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const DASHBOARD_CACHE_KEY =
  STORAGE_KEYS.LEARNING_DASHBOARD_CACHE_V1 || 'learning.dashboard-cache.v1';

export function loadDashboardCache() {
  const raw = getItem(DASHBOARD_CACHE_KEY, null);
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: 'v1', payload: null, updatedAt: null };
  }
  return {
    schemaVersion: raw.schemaVersion || 'v1',
    payload: raw.payload || null,
    updatedAt: raw.updatedAt || null,
  };
}

export function saveDashboardCache(payload) {
  return setItem(DASHBOARD_CACHE_KEY, {
    schemaVersion: 'v1',
    payload: payload || null,
    updatedAt: new Date().toISOString(),
  });
}

export function clearDashboardCache() {
  return setItem(DASHBOARD_CACHE_KEY, {
    schemaVersion: 'v1',
    payload: null,
    updatedAt: new Date().toISOString(),
  });
}

export default {
  DASHBOARD_CACHE_KEY,
  loadDashboardCache,
  saveDashboardCache,
  clearDashboardCache,
};
