/**
 * Sprint-11B — Pattern Tutor Prompt Builder
 * System / Developer / User 3-part structure.
 * Does not mutate Runtime / DBs / Policy.
 */

export const PATTERN_TUTOR_RESPONSE_KEYS = [
  'title',
  'summary',
  'whyWrong',
  'patternExplanation',
  'commonMistakes',
  'reviewChecklist',
  'nextStudy',
  'confidence',
];

export const DEFAULT_USER_QUESTION = '왜 이 Pattern을 틀렸나요?';

/**
 * Normalize Pattern Tutor runtime snapshot (read-only view).
 * @param {object} [raw]
 * @returns {object}
 */
export function normalizePatternTutorSnapshot(raw = {}) {
  const pattern = raw.pattern || {};
  const mastery = raw.mastery || {};
  const weakness = raw.weakness || {};
  const recommendation = raw.recommendation || {};
  const recentAttempts = Array.isArray(raw.recentAttempts)
    ? raw.recentAttempts
    : [];

  return {
    pattern: {
      patternId:
        pattern.patternId ||
        raw.patternId ||
        recommendation.patternId ||
        mastery.patternId ||
        'UNKNOWN',
      name: pattern.name || pattern.title || null,
      topic: pattern.topic || null,
      difficulty: pattern.difficulty || raw.difficulty || null,
    },
    mastery: {
      patternId: mastery.patternId || null,
      masteryLevel: mastery.masteryLevel || mastery.level || 'UNKNOWN',
      score: mastery.score ?? null,
      attemptCount: mastery.attemptCount ?? raw.attemptCount ?? null,
      accuracy: mastery.accuracy ?? raw.accuracy ?? null,
    },
    weakness: {
      patternId: weakness.patternId || null,
      weaknessType:
        weakness.weaknessType ||
        weakness.signalType ||
        weakness.type ||
        'NONE',
      severity: weakness.severity || null,
      reason: weakness.reason || null,
    },
    recommendation: {
      patternId: recommendation.patternId || null,
      strategyType: recommendation.strategyType || null,
      reasonCode: recommendation.reasonCode || null,
      reason: recommendation.reason || null,
      priority: recommendation.priority ?? null,
    },
    recentAttempts,
    accuracy: raw.accuracy ?? mastery.accuracy ?? null,
    attemptCount: raw.attemptCount ?? mastery.attemptCount ?? null,
    lastAttempt: raw.lastAttempt || recentAttempts[0] || null,
    difficulty: raw.difficulty || pattern.difficulty || null,
    evidence: raw.evidence || null,
    policy: raw.policy || null,
    patternMetadata: raw.patternMetadata || raw.patternMeta || pattern || null,
    studentQuestion:
      typeof raw.studentQuestion === 'string' && raw.studentQuestion.trim()
        ? raw.studentQuestion.trim()
        : DEFAULT_USER_QUESTION,
  };
}

/**
 * System prompt — role & principles.
 * @returns {string}
 */
export function buildPatternTutorSystemPrompt() {
  return [
    '당신은 감정평가사 회계학 전문 튜터이다.',
    '',
    '원칙:',
    '1. 절대 정답만 설명하지 않는다.',
    '2. 학생 Mastery를 고려한다.',
    '3. Weakness를 고려한다.',
    '4. Recommendation을 따른다.',
    '5. Pattern 중심으로 설명한다.',
    '',
    '출력 규칙:',
    '- JSON ONLY (마크다운·설명 문장 금지)',
    '- 한국어로 작성',
    '- Runtime Recommendation / 학습 대상을 바꾸지 말 것',
    '- 새로운 Pattern을 추천하지 말 것',
  ].join('\n');
}

/**
 * Developer prompt — runtime facts for the model.
 * @param {object} snapshot
 * @returns {string}
 */
export function buildPatternTutorDeveloperPrompt(snapshot = {}) {
  const snap = normalizePatternTutorSnapshot(snapshot);
  const payload = {
    runtimeSnapshot: {
      pattern: snap.pattern,
      mastery: snap.mastery,
      weakness: snap.weakness,
      recommendation: snap.recommendation,
      recentAttempts: snap.recentAttempts,
      accuracy: snap.accuracy,
      attemptCount: snap.attemptCount,
      lastAttempt: snap.lastAttempt,
      difficulty: snap.difficulty,
      evidence: snap.evidence,
    },
    policy: snap.policy,
    evidence: snap.evidence,
    mastery: snap.mastery,
    weakness: snap.weakness,
    recommendation: snap.recommendation,
    patternMetadata: snap.patternMetadata,
    responseSchema: {
      title: 'string',
      summary: 'string',
      whyWrong: 'string',
      patternExplanation: 'string',
      commonMistakes: 'string[] | string',
      reviewChecklist: 'string[] | string',
      nextStudy: 'string',
      confidence: 'number (0..1) | string',
    },
  };

  return [
    '아래 Runtime Snapshot / Policy / Evidence / Mastery / Weakness / Recommendation / Pattern Metadata를 근거로 코칭하라.',
    '사실을 지어내지 말고, 제공된 스냅샷만 사용하라.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

/**
 * User prompt — student question or auto-generated.
 * @param {object} snapshot
 * @param {string} [question]
 * @returns {string}
 */
export function buildPatternTutorUserPrompt(snapshot = {}, question) {
  const snap = normalizePatternTutorSnapshot(snapshot);
  const q =
    typeof question === 'string' && question.trim()
      ? question.trim()
      : snap.studentQuestion || DEFAULT_USER_QUESTION;

  return [
    q,
    '',
    '위 질문에 대해 responseSchema에 맞는 JSON만 반환하라.',
  ].join('\n');
}

/**
 * Build System / Developer / User messages for Pattern Tutor.
 * @param {{
 *   patternId?: string,
 *   runtimeSnapshot?: object,
 *   studentState?: object,
 *   masteryState?: object,
 *   weaknessState?: object,
 *   recommendation?: object,
 *   studentQuestion?: string,
 * }} [input]
 * @returns {{
 *   messages: Array<{role:string, content:string}>,
 *   snapshot: object,
 *   system: string,
 *   developer: string,
 *   user: string,
 * }}
 */
export function buildPatternTutorPrompt(input = {}) {
  const runtime = input.runtimeSnapshot || {};
  const merged = {
    ...runtime,
    patternId: input.patternId || runtime.patternId,
    pattern: runtime.pattern || { patternId: input.patternId },
    mastery: input.masteryState || runtime.mastery || null,
    weakness: input.weaknessState || runtime.weakness || null,
    recommendation: input.recommendation || runtime.recommendation || null,
    studentState: input.studentState || runtime.studentState || null,
    studentQuestion: input.studentQuestion || runtime.studentQuestion,
  };

  if (input.studentState && typeof input.studentState === 'object') {
    if (input.studentState.accuracy != null) {
      merged.accuracy = input.studentState.accuracy;
    }
    if (input.studentState.attemptCount != null) {
      merged.attemptCount = input.studentState.attemptCount;
    }
    if (input.studentState.recentAttempts) {
      merged.recentAttempts = input.studentState.recentAttempts;
    }
    if (input.studentState.lastAttempt) {
      merged.lastAttempt = input.studentState.lastAttempt;
    }
  }

  const snapshot = normalizePatternTutorSnapshot(merged);
  const system = buildPatternTutorSystemPrompt();
  const developer = buildPatternTutorDeveloperPrompt(snapshot);
  const user = buildPatternTutorUserPrompt(snapshot, input.studentQuestion);

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
  PATTERN_TUTOR_RESPONSE_KEYS,
  DEFAULT_USER_QUESTION,
  normalizePatternTutorSnapshot,
  buildPatternTutorSystemPrompt,
  buildPatternTutorDeveloperPrompt,
  buildPatternTutorUserPrompt,
  buildPatternTutorPrompt,
};
