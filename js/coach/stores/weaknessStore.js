/**
 * Coach Phase C3 — WeaknessReport store
 * LocalStorage key: coach.weakness.v1 (additive only)
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../../storage.js';
import {
  createWeaknessReport,
  validateWeaknessReport,
} from '../models/weakness-report.js';

export const COACH_WEAKNESS_KEY = STORAGE_KEYS.COACH_WEAKNESS_V1;

/**
 * @returns {{ version: number, generatedAt: string|null, reports: object[] }}
 */
function emptyDoc() {
  return { version: 1, generatedAt: null, reports: [] };
}

/**
 * @returns {{ version: number, generatedAt: string|null, reports: object[] }}
 */
function readDoc() {
  const raw = getItem(COACH_WEAKNESS_KEY, null);
  if (!raw || !Array.isArray(raw.reports)) {
    return emptyDoc();
  }
  return {
    version: Number(raw.version) || 1,
    generatedAt: raw.generatedAt || null,
    reports: raw.reports.map((r) => createWeaknessReport(r)),
  };
}

/**
 * Replace full report set (diagnosis snapshot).
 * @param {object[]} reports
 * @param {string} [generatedAt]
 * @returns {{ ok: boolean, errors: string[], count: number }}
 */
export function saveReports(reports, generatedAt) {
  if (!Array.isArray(reports)) {
    return { ok: false, errors: ['reports must be array'], count: 0 };
  }
  const normalized = [];
  const errors = [];
  for (const row of reports) {
    const report = createWeaknessReport(row);
    const v = validateWeaknessReport(report);
    if (!v.ok) {
      errors.push(`${report.patternId}: ${v.errors.join('; ')}`);
      continue;
    }
    normalized.push(report);
  }
  if (errors.length) {
    return { ok: false, errors, count: 0 };
  }
  const ok = setItem(COACH_WEAKNESS_KEY, {
    version: 1,
    generatedAt: generatedAt || new Date().toISOString(),
    reports: normalized,
  });
  return {
    ok,
    errors: ok ? [] : ['LocalStorage write failed'],
    count: normalized.length,
  };
}

/**
 * @param {string} patternId
 * @returns {object|null}
 */
export function getReport(patternId) {
  return readDoc().reports.find((r) => r.patternId === patternId) || null;
}

/**
 * Patterns with severity critical or weak, sorted worst-first.
 * @returns {object[]}
 */
export function getWeakPatterns() {
  const rank = { critical: 0, weak: 1, normal: 2, mastered: 3 };
  return readDoc()
    .reports.filter((r) => r.severity === 'critical' || r.severity === 'weak')
    .sort((a, b) => {
      const rd = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
      if (rd !== 0) return rd;
      return a.accuracy - b.accuracy;
    });
}

/**
 * Clears ONLY coach.weakness.v1.
 * @returns {boolean}
 */
export function clearWeakness() {
  try {
    removeItem(COACH_WEAKNESS_KEY);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * @returns {object[]}
 */
export function getAllReports() {
  return readDoc().reports.slice();
}

export const weaknessStore = {
  saveReports,
  getReport,
  getWeakPatterns,
  clearWeakness,
  getAllReports,
  KEY: COACH_WEAKNESS_KEY,
};
