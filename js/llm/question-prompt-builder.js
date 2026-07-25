/**
 * Sprint-11C — Question Tutor Prompt Builder
 * System / Developer / User 3-part structure.
 * Does not mutate Runtime / DBs / Policy.
 */

export const QUESTION_TUTOR_RESPONSE_KEYS = [
  'title',
  'summary',
  'correctAnswer',
  'whyWrong',
  'mistakeType',
  'stepByStep',
  'keyConcept',
  'relatedPattern',
  'reviewChecklist',
  'similarTrap',
  'nextQuestion',
  'confidence',
];

export const MISTAKE_TYPES = [
  'CALCULATION',
  'CONCEPT',
  'MEMORIZATION',
  'MISREAD',
  'TIME_PRESSURE',
  'UNKNOWN',
];

export const DEFAULT_QUESTION_USER_PROMPT = '이 문제를 왜 틀렸나요?';

/**
 * Sanitize a single question for the prompt (no full DB dump).
 * @param {object|null} question
 * @returns {object|null}
 */
export function sanitizeQuestionForPrompt(question) {
  if (!question || typeof question !== 'object') return null;
  return {
    id: question.id || question.questionId || null,
    title: question.title || null,
    question: question.question || question.stem || question.text || null,
    choices: Array.isArray(question.choices) ? question.choices : null,
    answer: question.answer ?? question.correctAnswer ?? null,
    patternId:
      question.primaryPattern || question.patternId || question.pattern || null,
    examYear: question.examYear ?? null,
    difficulty: question.difficulty ?? null,
    questionPoint: question.questionPoint || null,
  };
}

/**
 * Sanitize attempt for the prompt.
 * @param {object|null} attempt
 * @returns {object|null}
 */
export function sanitizeAttemptForPrompt(attempt) {
  if (!attempt || typeof attempt !== 'object') return null;
  return {
    questionId: attempt.questionId || attempt.id || null,
    selectedAnswer: attempt.selectedAnswer ?? attempt.choice ?? attempt.answer ?? null,
    isCorrect: attempt.isCorrect ?? attempt.correct ?? null,
    timeSpentMs: attempt.timeSpentMs ?? attempt.durationMs ?? null,
    mistakeType: attempt.mistakeType || null,
    patternId: attempt.patternId || null,
    attemptedAt: attempt.attemptedAt || attempt.timestamp || null,
  };
}

/**
 * Normalize Question Tutor snapshot.
 * @param {object} [raw]
 */
export function normalizeQuestionTutorSnapshot(raw = {}) {
  const question = sanitizeQuestionForPrompt(raw.question);
  const attempt = sanitizeAttemptForPrompt(raw.attempt);
  const pattern = raw.pattern || {};
  const mastery = raw.mastery || {};
  const weakness = raw.weakness || {};
  const recommendation = raw.recommendation || {};

  const patternId =
    pattern.patternId ||
    question?.patternId ||
    attempt?.patternId ||
    recommendation.patternId ||
    mastery.patternId ||
    'UNKNOWN';

  return {
    question,
    attempt,
    pattern: {
      patternId,
      name: pattern.name || pattern.title || null,
      topic: pattern.topic || null,
    },
    mastery: {
      patternId: mastery.patternId || patternId,
      masteryLevel: mastery.masteryLevel || mastery.level || 'UNKNOWN',
      accuracy: mastery.accuracy ?? null,
      attemptCount: mastery.attemptCount ?? null,
    },
    weakness: {
      patternId: weakness.patternId || patternId,
      weaknessType:
        weakness.weaknessType ||
        weakness.signalType ||
        weakness.type ||
        'NONE',
      severity: weakness.severity || null,
    },
    recommendation: {
      patternId: recommendation.patternId || patternId,
      strategyType: recommendation.strategyType || null,
      reasonCode: recommendation.reasonCode || null,
      reason: recommendation.reason || null,
    },
    evidence: raw.evidence || null,
    studentState: raw.studentState || null,
    runtimeSnapshot: raw.runtimeSnapshot || null,
    studentQuestion:
      typeof raw.studentQuestion === 'string' && raw.studentQuestion.trim()
        ? raw.studentQuestion.trim()
        : DEFAULT_QUESTION_USER_PROMPT,
  };
}

export function buildQuestionTutorSystemPrompt() {
  return [
    '당신은 감정평가사 회계학 전문 튜터이다.',
    '',
    '원칙:',
    '1. 정답만 말하지 않는다.',
    '2. 학생의 오답 이유를 먼저 설명한다.',
    '3. 계산 실수인지, 개념 부족인지, 암기 부족인지, Pattern 이해 부족인지 구분한다.',
    '4. Runtime Recommendation을 수정하지 않는다.',
    '5. 새로운 문항/Pattern을 임의로 추천하지 않는다.',
    '',
    'mistakeType은 다음 ENUM 중 하나만 사용한다:',
    MISTAKE_TYPES.join(', '),
    '',
    '출력 규칙:',
    '- JSON ONLY (마크다운·설명 문장 금지)',
    '- 한국어로 작성',
  ].join('\n');
}

export function buildQuestionTutorDeveloperPrompt(snapshot = {}) {
  const snap = normalizeQuestionTutorSnapshot(snapshot);
  const payload = {
    runtimeSnapshot: snap.runtimeSnapshot || {
      mastery: snap.mastery,
      weakness: snap.weakness,
      recommendation: snap.recommendation,
    },
    question: snap.question,
    pattern: snap.pattern,
    mastery: snap.mastery,
    weakness: snap.weakness,
    recommendation: snap.recommendation,
    evidence: snap.evidence,
    attempt: snap.attempt,
    responseSchema: {
      title: 'string',
      summary: 'string',
      correctAnswer: 'string',
      whyWrong: 'string',
      mistakeType: MISTAKE_TYPES.join('|'),
      stepByStep: 'string[] | string',
      keyConcept: 'string',
      relatedPattern: 'string',
      reviewChecklist: 'string[] | string',
      similarTrap: 'string',
      nextQuestion: 'string',
      confidence: 'number (0..1)',
    },
  };

  return [
    '아래 Runtime Snapshot / Question / Pattern / Mastery / Weakness / Recommendation / Evidence / Attempt를 근거로 해설하라.',
    '제공된 단일 문항과 시도만 사용하고, DB 전체를 가정하지 말라.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

export function buildQuestionTutorUserPrompt(snapshot = {}, question) {
  const snap = normalizeQuestionTutorSnapshot(snapshot);
  const q =
    typeof question === 'string' && question.trim()
      ? question.trim()
      : snap.studentQuestion || DEFAULT_QUESTION_USER_PROMPT;
  return [
    q,
    '',
    '위 질문에 대해 responseSchema에 맞는 JSON만 반환하라.',
  ].join('\n');
}

/**
 * Build System / Developer / User messages for Question Tutor.
 * @param {{
 *   question?: object,
 *   attempt?: object,
 *   runtimeSnapshot?: object,
 *   studentState?: object,
 *   pattern?: object,
 *   mastery?: object,
 *   weakness?: object,
 *   recommendation?: object,
 *   evidence?: object,
 *   studentQuestion?: string,
 * }} [input]
 */
export function buildQuestionTutorPrompt(input = {}) {
  const runtime = input.runtimeSnapshot || {};
  const merged = {
    runtimeSnapshot: runtime,
    question: input.question || runtime.question || null,
    attempt: input.attempt || runtime.attempt || null,
    pattern: input.pattern || runtime.pattern || null,
    mastery: input.mastery || runtime.mastery || null,
    weakness: input.weakness || runtime.weakness || null,
    recommendation: input.recommendation || runtime.recommendation || null,
    evidence: input.evidence || runtime.evidence || null,
    studentState: input.studentState || runtime.studentState || null,
    studentQuestion: input.studentQuestion || runtime.studentQuestion,
  };

  const snapshot = normalizeQuestionTutorSnapshot(merged);
  const system = buildQuestionTutorSystemPrompt();
  const developer = buildQuestionTutorDeveloperPrompt(snapshot);
  const user = buildQuestionTutorUserPrompt(snapshot, input.studentQuestion);

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'developer', content: developer },
      { role: 'user', content: user },
    ],
    snapshot,
    system,
    developer,
    user,
  };
}

export default {
  QUESTION_TUTOR_RESPONSE_KEYS,
  MISTAKE_TYPES,
  DEFAULT_QUESTION_USER_PROMPT,
  sanitizeQuestionForPrompt,
  sanitizeAttemptForPrompt,
  normalizeQuestionTutorSnapshot,
  buildQuestionTutorSystemPrompt,
  buildQuestionTutorDeveloperPrompt,
  buildQuestionTutorUserPrompt,
  buildQuestionTutorPrompt,
};
