/**
 * AI Exam Learning Platform v2
 * Data Loader — Phase 1 JSON Database 로딩 및 검증
 *
 * Official DB: data/phase1-freeze-manifest.json (phase1-v1.0)
 * Question DB 구조 변경 금지 — Schema 문서 선행 업데이트 필수
 */

const PHASE1_PATHS = {
  master: 'data/master-db.json',
  patterns: 'data/pattern-db.json',
  questions: 'data/question-db.json',
  statistics: 'data/statistics.json',
};

const CHOICE_SYMBOLS = ['①', '②', '③', '④', '⑤'];

/**
 * JSON 파일을 fetch하여 파싱한다.
 * @param {string} path
 * @returns {Promise<object|array>}
 */
export async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${path}`);
  }
  return response.json();
}

/**
 * Phase 1 공식 Database를 로드한다.
 * @returns {Promise<{ master: object, patterns: array, questions: array, statistics: array, valid: boolean, errors: string[] }>}
 */
export async function loadPhase1Database() {
  const errors = [];

  let master;
  let patterns;
  let questions;
  let statistics;

  try {
    [master, patterns, questions, statistics] = await Promise.all([
      loadJSON(PHASE1_PATHS.master),
      loadJSON(PHASE1_PATHS.patterns),
      loadJSON(PHASE1_PATHS.questions),
      loadJSON(PHASE1_PATHS.statistics),
    ]);
  } catch (error) {
    return {
      master: null,
      patterns: [],
      questions: [],
      statistics: [],
      valid: false,
      errors: [error.message],
    };
  }

  if (!master?.metadata?.pdfVerified) {
    errors.push('master-db: pdfVerified가 true가 아닙니다.');
  }

  if (!Array.isArray(patterns) || patterns.length === 0) {
    errors.push('pattern-db: 비어 있거나 배열이 아닙니다.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('question-db: 비어 있거나 배열이 아닙니다.');
  }

  if (!Array.isArray(statistics)) {
    errors.push('statistics.json: 배열이 아닙니다.');
  }

  const patternIds = new Set(patterns.map((p) => p.patternId));

  for (const q of questions) {
    const req = ['questionId', 'patternId', 'question', 'choices', 'answer', 'solution', 'originalQuestion', 'source'];
    for (const field of req) {
      if (q[field] === undefined || q[field] === null) {
        errors.push(`${q.questionId || '?'}: 필수 필드 누락 (${field})`);
      }
    }
    if (q.patternId && !patternIds.has(q.patternId)) {
      errors.push(`${q.questionId}: invalid patternId ${q.patternId}`);
    }
    if (q.source?.type !== 'past_exam') {
      errors.push(`${q.questionId}: source.type must be past_exam`);
    }
    if (q.source?.year !== undefined && q.year !== undefined && q.source.year !== q.year) {
      errors.push(`${q.questionId}: year/source.year 불일치`);
    }
  }

  for (const p of patterns) {
    const cnt = questions.filter((q) => q.patternId === p.patternId).length;
    if (p.frequency !== cnt) {
      errors.push(`${p.patternId}: frequency(${p.frequency}) != questions(${cnt})`);
    }
  }

  return {
    master,
    patterns,
    questions,
    statistics,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * @deprecated Phase 0 master — Phase 1 이후 loadPhase1Database 사용
 */
export async function loadMasterDB() {
  return loadPhase1Database().then(({ master, valid, errors }) => ({
    data: master,
    valid,
    errors,
  }));
}

/**
 * Question ID로 문항을 조회한다.
 * @param {array} questions
 * @param {string} questionId
 */
export function getQuestionById(questions, questionId) {
  return questions.find((q) => q.questionId === questionId) || null;
}

/**
 * Pattern ID로 Pattern 메타를 조회한다.
 * @param {array} patterns
 * @param {string} patternId
 */
export function getPatternById(patterns, patternId) {
  return patterns.find((p) => p.patternId === patternId) || null;
}

/**
 * 보기 라벨(①~⑤)을 반환한다.
 * @param {number} index - 1-based
 */
export function getChoiceLabel(index) {
  return CHOICE_SYMBOLS[index - 1] || String(index);
}

export { PHASE1_PATHS, CHOICE_SYMBOLS };
