/**
 * Coach Agent Layer — public exports (Phase C1 + C2 + C3)
 */

export {
  COACH_MODEL_CONSTANTS,
  createUserProfile,
  validateUserProfile,
  createQuestionAttempt,
  validateQuestionAttempt,
  createWeaknessReport,
  validateWeaknessReport,
  isCanonicalPatternId,
  nowIso,
} from './models.js';

export {
  loadUserProfile,
  saveUserProfile,
  seedUserProfileFromMock,
} from './profile-store.js';

export {
  loadAttemptStore,
  listQuestionAttempts,
  listAttemptsByUser,
  appendQuestionAttempt,
  seedAttemptsFromMock,
} from './attempt-store.js';

export {
  loadWeaknessStore,
  listWeaknessReports,
  listWeaknessByUser,
  upsertWeaknessReport,
  seedWeaknessFromMock,
} from './weakness-store.js';

export {
  AIProvider,
  MockAIProvider,
  setAIProvider,
  getAIProvider,
} from './ai-provider.js';

/* Phase C2 — append-only attempt contract */
export {
  ATTEMPT_TYPES,
  ATTEMPT_SOURCES,
  createQuestionAttempt as createCoachAttempt,
  validateQuestionAttempt as validateCoachAttempt,
  isCanonicalPatternId as isCoachCanonicalPatternId,
} from './models/question-attempt.js';

export {
  addAttempt,
  getAttempts,
  getQuestionHistory,
  getPatternHistory,
  clearCoachData,
  seedAttempts,
  attemptStore,
  COACH_ATTEMPTS_KEY,
} from './stores/attemptStore.js';

export {
  toQuestionAttempt,
  recordAttemptFromEngine,
} from './adapters/question-engine-adapter.js';

/* Phase C3 — Weakness diagnosis (no recommendations) */
export { WEAKNESS_CONFIG } from './config/weakness-config.js';
export {
  WEAKNESS_SEVERITIES,
  RECENT_TRENDS,
  createWeaknessReport as createCoachWeaknessReport,
  validateWeaknessReport as validateCoachWeaknessReport,
} from './models/weakness-report.js';
export { assignSeverity, computeRecentTrend } from './diagnosis/severity-rules.js';
export {
  diagnoseWeaknesses,
  diagnosePattern,
  WeaknessDiagnosisEngine,
} from './diagnosis/weakness-engine.js';
export {
  saveReports,
  getReport,
  getWeakPatterns,
  clearWeakness,
  getAllReports,
  weaknessStore,
  COACH_WEAKNESS_KEY,
} from './stores/weaknessStore.js';
