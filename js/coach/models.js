/**
 * Coach Agent — Data Models (Phase C1)
 * UserProfile / QuestionAttempt / WeaknessReport
 *
 * Pattern IDs must be Canonical (e.g. ACC_INV_003), matching pattern-db.
 */

const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const ERROR_TYPES = new Set([
  '개념 오류',
  '계산 오류',
  '조건 누락',
  '보기 혼동',
  '시간 부족',
  '미분류',
]);

/**
 * @returns {string}
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} list
 * @returns {boolean}
 */
function isStringArray(list) {
  return Array.isArray(list) && list.every((item) => typeof item === 'string');
}

/**
 * Canonical pattern id: ACC_XXX_NNN
 * @param {string} patternId
 * @returns {boolean}
 */
export function isCanonicalPatternId(patternId) {
  return typeof patternId === 'string' && /^ACC_[A-Z]+_\d{3}$/.test(patternId);
}

/**
 * @param {object} [input]
 * @returns {object}
 */
export function createUserProfile(input = {}) {
  const currentScore = isPlainObject(input.currentScore) ? { ...input.currentScore } : {};
  const targetScore = isPlainObject(input.targetScore) ? { ...input.targetScore } : {};
  const studyTime = isPlainObject(input.studyTime)
    ? {
        totalMinutes: Number(input.studyTime.totalMinutes) || 0,
        weekMinutes: Number(input.studyTime.weekMinutes) || 0,
      }
    : { totalMinutes: 0, weekMinutes: 0 };

  return {
    userId: input.userId ?? '001',
    examTarget: input.examTarget ?? '감정평가사 1차',
    examDate: input.examDate ?? null,
    currentScore,
    targetScore,
    studyTime,
    solvedQuestions: Number(input.solvedQuestions) || 0,
    accuracyRate: Number(input.accuracyRate) || 0,
    weakPatterns: Array.isArray(input.weakPatterns) ? [...input.weakPatterns] : [],
    strongPatterns: Array.isArray(input.strongPatterns) ? [...input.strongPatterns] : [],
    learningHistory: Array.isArray(input.learningHistory) ? [...input.learningHistory] : [],
    updatedAt: input.updatedAt ?? nowIso(),
  };
}

/**
 * @param {object} profile
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateUserProfile(profile) {
  const errors = [];
  if (!isPlainObject(profile)) {
    return { ok: false, errors: ['profile must be an object'] };
  }
  if (typeof profile.userId !== 'string' || !profile.userId) {
    errors.push('userId required');
  }
  if (typeof profile.examTarget !== 'string' || !profile.examTarget) {
    errors.push('examTarget required');
  }
  if (!isPlainObject(profile.currentScore)) errors.push('currentScore must be object');
  if (!isPlainObject(profile.targetScore)) errors.push('targetScore must be object');
  if (!isPlainObject(profile.studyTime)) errors.push('studyTime must be object');
  if (typeof profile.solvedQuestions !== 'number') errors.push('solvedQuestions must be number');
  if (typeof profile.accuracyRate !== 'number' || profile.accuracyRate < 0 || profile.accuracyRate > 1) {
    errors.push('accuracyRate must be number in [0,1]');
  }
  if (!isStringArray(profile.weakPatterns)) errors.push('weakPatterns must be string[]');
  if (!isStringArray(profile.strongPatterns)) errors.push('strongPatterns must be string[]');
  for (const pid of profile.weakPatterns || []) {
    if (!isCanonicalPatternId(pid)) errors.push(`weakPatterns invalid patternId: ${pid}`);
  }
  for (const pid of profile.strongPatterns || []) {
    if (!isCanonicalPatternId(pid)) errors.push(`strongPatterns invalid patternId: ${pid}`);
  }
  if (!Array.isArray(profile.learningHistory)) errors.push('learningHistory must be array');
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} [input]
 * @returns {object}
 */
export function createQuestionAttempt(input = {}) {
  const correct = Boolean(input.correct);
  return {
    attemptId: input.attemptId ?? `att_${Date.now()}`,
    userId: input.userId ?? '001',
    questionId: input.questionId ?? '',
    patternId: input.patternId ?? '',
    answer: input.answer === undefined || input.answer === null ? null : Number(input.answer),
    correct,
    solvingTime: Number(input.solvingTime) || 0,
    errorType: correct ? null : input.errorType ?? '미분류',
    difficulty: input.difficulty ?? 'medium',
    source: input.source ?? 'practice',
    createdAt: input.createdAt ?? nowIso(),
  };
}

/**
 * @param {object} attempt
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateQuestionAttempt(attempt) {
  const errors = [];
  if (!isPlainObject(attempt)) {
    return { ok: false, errors: ['attempt must be an object'] };
  }
  if (typeof attempt.attemptId !== 'string' || !attempt.attemptId) {
    errors.push('attemptId required');
  }
  if (typeof attempt.userId !== 'string' || !attempt.userId) {
    errors.push('userId required');
  }
  if (typeof attempt.questionId !== 'string' || !attempt.questionId) {
    errors.push('questionId required');
  }
  if (!isCanonicalPatternId(attempt.patternId)) {
    errors.push(`patternId must be Canonical ACC_*: ${attempt.patternId}`);
  }
  if (typeof attempt.correct !== 'boolean') errors.push('correct must be boolean');
  if (typeof attempt.solvingTime !== 'number' || attempt.solvingTime < 0) {
    errors.push('solvingTime must be non-negative number');
  }
  if (!attempt.correct) {
    if (attempt.errorType != null && !ERROR_TYPES.has(attempt.errorType)) {
      errors.push(`errorType not allowed: ${attempt.errorType}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} [input]
 * @returns {object}
 */
export function createWeaknessReport(input = {}) {
  return {
    reportId: input.reportId ?? `wr_${Date.now()}`,
    userId: input.userId ?? '001',
    patternId: input.patternId ?? '',
    concept: input.concept ?? '',
    errorType: input.errorType ?? '미분류',
    severity: input.severity ?? 'MEDIUM',
    failureRate: Number(input.failureRate) || 0,
    repeatWrongCount: Number(input.repeatWrongCount) || 0,
    recommendation: input.recommendation ?? '',
    evidenceAttemptIds: Array.isArray(input.evidenceAttemptIds)
      ? [...input.evidenceAttemptIds]
      : [],
    createdAt: input.createdAt ?? nowIso(),
  };
}

/**
 * @param {object} report
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateWeaknessReport(report) {
  const errors = [];
  if (!isPlainObject(report)) {
    return { ok: false, errors: ['report must be an object'] };
  }
  if (typeof report.reportId !== 'string' || !report.reportId) {
    errors.push('reportId required');
  }
  if (typeof report.userId !== 'string' || !report.userId) {
    errors.push('userId required');
  }
  if (!isCanonicalPatternId(report.patternId)) {
    errors.push(`patternId must be Canonical ACC_*: ${report.patternId}`);
  }
  if (typeof report.concept !== 'string') errors.push('concept must be string');
  if (!SEVERITIES.has(report.severity)) {
    errors.push(`severity must be one of ${[...SEVERITIES].join(',')}`);
  }
  if (typeof report.failureRate !== 'number' || report.failureRate < 0 || report.failureRate > 1) {
    errors.push('failureRate must be number in [0,1]');
  }
  if (typeof report.recommendation !== 'string') errors.push('recommendation must be string');
  if (!Array.isArray(report.evidenceAttemptIds)) {
    errors.push('evidenceAttemptIds must be array');
  }
  return { ok: errors.length === 0, errors };
}

export const COACH_MODEL_CONSTANTS = {
  SEVERITIES: [...SEVERITIES],
  ERROR_TYPES: [...ERROR_TYPES],
};
