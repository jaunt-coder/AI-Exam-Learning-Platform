/**
 * WeaknessReport LocalStorage store (Coach Phase C1)
 * Key: weaknessReports — additive.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';
import { createWeaknessReport, validateWeaknessReport } from './models.js';

const KEY = STORAGE_KEYS.WEAKNESS_REPORTS;

/**
 * @returns {{ version: number, reports: object[] }}
 */
function emptyStore() {
  return { version: 1, reports: [] };
}

/**
 * @returns {{ version: number, reports: object[] }}
 */
export function loadWeaknessStore() {
  const raw = getItem(KEY, null);
  if (!raw || !Array.isArray(raw.reports)) {
    return emptyStore();
  }
  return {
    version: Number(raw.version) || 1,
    reports: raw.reports.map((item) => createWeaknessReport(item)),
  };
}

/**
 * @param {{ version?: number, reports: object[] }} store
 * @returns {boolean}
 */
function persist(store) {
  return setItem(KEY, {
    version: store.version || 1,
    reports: store.reports,
  });
}

/**
 * @returns {object[]}
 */
export function listWeaknessReports() {
  return loadWeaknessStore().reports;
}

/**
 * @param {string} userId
 * @returns {object[]}
 */
export function listWeaknessByUser(userId) {
  return listWeaknessReports().filter((r) => r.userId === userId);
}

/**
 * Upsert by (userId, patternId) — latest diagnosis wins.
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[], report?: object }}
 */
export function upsertWeaknessReport(input) {
  const report = createWeaknessReport(input);
  const result = validateWeaknessReport(report);
  if (!result.ok) {
    return result;
  }
  const store = loadWeaknessStore();
  const idx = store.reports.findIndex(
    (r) => r.userId === report.userId && r.patternId === report.patternId,
  );
  if (idx >= 0) {
    store.reports[idx] = report;
  } else {
    store.reports.push(report);
  }
  if (!persist(store)) {
    return { ok: false, errors: ['LocalStorage write failed'] };
  }
  return { ok: true, errors: [], report };
}

/**
 * @param {object[]} mocks
 * @returns {{ ok: boolean, errors: string[], count: number }}
 */
export function seedWeaknessFromMock(mocks) {
  if (!Array.isArray(mocks)) {
    return { ok: false, errors: ['mock must be array'], count: 0 };
  }
  const reports = [];
  const errors = [];
  for (const item of mocks) {
    const report = createWeaknessReport(item);
    const v = validateWeaknessReport(report);
    if (!v.ok) {
      errors.push(...v.errors.map((e) => `${report.reportId}: ${e}`));
      continue;
    }
    reports.push(report);
  }
  if (errors.length) {
    return { ok: false, errors, count: 0 };
  }
  const written = persist({ version: 1, reports });
  return {
    ok: written,
    errors: written ? [] : ['LocalStorage write failed'],
    count: reports.length,
  };
}
