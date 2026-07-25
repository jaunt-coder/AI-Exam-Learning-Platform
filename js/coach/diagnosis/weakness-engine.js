/**
 * Coach Phase C3 — WeaknessDiagnosisEngine
 *
 * Input: QuestionAttempt[]
 * Output: WeaknessReport[] (diagnosis only — no recommendations)
 */

import { WEAKNESS_CONFIG } from '../config/weakness-config.js';
import {
  createWeaknessReport,
  validateWeaknessReport,
} from '../models/weakness-report.js';
import { assignSeverity, computeRecentTrend } from './severity-rules.js';

/**
 * @param {object[]} attempts
 * @returns {Map<string, object[]>}
 */
function groupByPattern(attempts) {
  const map = new Map();
  for (const row of attempts || []) {
    const pid = row.patternId;
    if (!pid) continue;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid).push(row);
  }
  for (const list of map.values()) {
    list.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }
  return map;
}

/**
 * Diagnose a single pattern's attempts (already sorted ascending by time).
 * @param {string} patternId
 * @param {object[]} sortedAttempts
 * @param {object} [config]
 * @param {string} [generatedAt]
 * @returns {object}
 */
export function diagnosePattern(
  patternId,
  sortedAttempts,
  config = WEAKNESS_CONFIG,
  generatedAt,
) {
  const totalAttempts = sortedAttempts.length;
  const correctCount = sortedAttempts.filter((a) => a.isCorrect).length;
  const wrongCount = totalAttempts - correctCount;
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
  const elapsedSum = sortedAttempts.reduce(
    (acc, a) => acc + (Number(a.elapsedSeconds) || 0),
    0,
  );
  const averageElapsedSeconds =
    totalAttempts > 0 ? elapsedSum / totalAttempts : 0;
  const recentTrend = computeRecentTrend(sortedAttempts, config);
  const severity = assignSeverity(
    { accuracy, wrongCount, totalAttempts, averageElapsedSeconds },
    config,
  );

  return createWeaknessReport({
    patternId,
    totalAttempts,
    correctCount,
    wrongCount,
    accuracy,
    averageElapsedSeconds,
    recentTrend,
    severity,
    generatedAt: generatedAt || '2026-07-20T12:00:00.000Z',
  });
}

/**
 * Full engine: attempts → WeaknessReport[] (deterministic order by patternId).
 * @param {object[]} attempts
 * @param {object} [options]
 * @returns {{ ok: boolean, errors: string[], reports: object[] }}
 */
export function diagnoseWeaknesses(attempts, options = {}) {
  const config = options.config || WEAKNESS_CONFIG;
  const generatedAt = options.generatedAt || '2026-07-20T12:00:00.000Z';
  const grouped = groupByPattern(attempts);
  const patternIds = [...grouped.keys()].sort();
  const reports = [];
  const errors = [];

  for (const patternId of patternIds) {
    const report = diagnosePattern(
      patternId,
      grouped.get(patternId),
      config,
      generatedAt,
    );
    const v = validateWeaknessReport(report);
    if (!v.ok) {
      errors.push(...v.errors.map((e) => `${patternId}: ${e}`));
      continue;
    }
    reports.push(report);
  }

  return { ok: errors.length === 0, errors, reports };
}

export const WeaknessDiagnosisEngine = {
  diagnoseWeaknesses,
  diagnosePattern,
};
