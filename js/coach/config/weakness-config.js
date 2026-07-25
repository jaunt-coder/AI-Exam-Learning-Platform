/**
 * Coach Phase C3 — Weakness diagnosis thresholds (NOT hardcoded in engine).
 * Keep in sync with data/coach/weakness-config.json
 */

export const WEAKNESS_CONFIG = Object.freeze({
  version: 1,
  recentWindow: 5,
  minAttemptsForSeverity: 2,
  minAttemptsForTrend: 3,
  timeoutAverageSeconds: 300,
  severity: Object.freeze({
    mastered: Object.freeze({
      minAccuracy: 0.85,
      minAttempts: 3,
    }),
    critical: Object.freeze({
      maxAccuracy: 0.35,
      minWrong: 3,
    }),
    weak: Object.freeze({
      maxAccuracy: 0.55,
    }),
    timeoutBoost: Object.freeze({
      from: 'normal',
      to: 'weak',
      whenAverageElapsedGte: 300,
    }),
    timeoutBoostWeakToCritical: Object.freeze({
      enabled: true,
      whenAverageElapsedGte: 300,
      maxAccuracy: 0.5,
    }),
  }),
  trend: Object.freeze({
    improvingDelta: 0.15,
    decliningDelta: -0.15,
  }),
});
