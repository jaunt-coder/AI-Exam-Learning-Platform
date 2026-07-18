/**
 * AI Exam Learning Platform v2
 * Data Loader — JSON Database 로딩 및 검증
 *
 * 기본: data/question-db-mvp.json (Phase 1.5 MVP)
 * Fallback: data/question-db.json (Phase 1 Freeze)
 *
 * Phase 1 Freeze 파일 직접 수정 금지.
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { applyQuestionCleanup } from './data-cleaner.js';

const MASTER_PATH = 'data/master-db.json';

const DB_PATH_SETS = {
  mvp: {
    id: 'mvp',
    label: 'MVP v1.0 · 6개년 240문항',
    questions: 'data/question-db-mvp.json',
    patterns: 'data/pattern-db-mvp.json',
    statistics: 'data/statistics-mvp.json',
  },
  phase1: {
    id: 'phase1',
    label: 'Phase 1 Freeze · 재고자산',
    questions: 'data/question-db.json',
    patterns: 'data/pattern-db.json',
    statistics: 'data/statistics.json',
  },
};

const DEFAULT_DB_SET = 'mvp';
const FALLBACK_DB_SET = 'phase1';

/** @deprecated Phase 1 Freeze 경로 — resolveDatabaseConfig() 사용 권장 */
const PHASE1_PATHS = {
  master: MASTER_PATH,
  patterns: DB_PATH_SETS.phase1.patterns,
  questions: DB_PATH_SETS.phase1.questions,
  statistics: DB_PATH_SETS.phase1.statistics,
};

const CHOICE_SYMBOLS = ['①', '②', '③', '④', '⑤'];
const ALLOWED_SOURCE_TYPES = new Set(['past_exam', 'original_exam']);

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
 * 환경 설정에 따라 사용할 DB 경로 세트를 결정한다.
 * 우선순위: URL ?db= · settings.questionDb · window.APP_DB_CONFIG · 기본 MVP
 * @returns {typeof DB_PATH_SETS.mvp}
 */
export function resolveDatabaseConfig() {
  if (typeof window !== 'undefined') {
    const queryDb = new URLSearchParams(window.location.search).get('db');
    if (queryDb === 'mvp' || queryDb === 'phase1') {
      return DB_PATH_SETS[queryDb];
    }
  }

  const settings = getItem(STORAGE_KEYS.SETTINGS, {});
  if (settings.questionDb === 'mvp' || settings.questionDb === 'phase1') {
    return DB_PATH_SETS[settings.questionDb];
  }

  if (typeof window !== 'undefined' && window.APP_DB_CONFIG?.questionDb) {
    const configured = window.APP_DB_CONFIG.questionDb;
    if (DB_PATH_SETS[configured]) {
      return DB_PATH_SETS[configured];
    }
  }

  return DB_PATH_SETS[DEFAULT_DB_SET];
}

/**
 * question-db payload를 문항 배열로 정규화한다.
 * @param {array|object} payload
 * @returns {array}
 */
export function normalizeQuestionsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.questions)) {
    return payload.questions;
  }
  return [];
}

/**
 * @param {typeof DB_PATH_SETS.mvp} dbSet
 * @param {object} data
 * @param {object} [options]
 */
function validateDatabasePayload(dbSet, data, options = {}) {
  const errors = [];
  const { master, patterns, questions, statistics } = data;

  if (!master || typeof master !== 'object') {
    errors.push('master-db: 로드 실패');
  } else if (dbSet.id === 'phase1' && !master?.metadata?.pdfVerified) {
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

  const patternIds = new Set((patterns || []).map((p) => p.patternId));

  for (const q of questions || []) {
    const req = ['questionId', 'patternId', 'question', 'choices', 'answer', 'solution', 'originalQuestion', 'source'];
    for (const field of req) {
      if (q[field] === undefined || q[field] === null) {
        errors.push(`${q.questionId || '?'}: 필수 필드 누락 (${field})`);
      }
    }

    const choices = q.choices || [];
    if (choices.length !== 5) {
      errors.push(`${q.questionId || '?'}: 보기 ${choices.length}개`);
    }

    if (q.answer === undefined || q.answer === null) {
      errors.push(`${q.questionId || '?'}: answer 누락`);
    }

    if (q.patternId && !patternIds.has(q.patternId)) {
      errors.push(`${q.questionId}: invalid patternId ${q.patternId}`);
    }

    const sourceType = q.source?.type;
    if (sourceType && !ALLOWED_SOURCE_TYPES.has(sourceType)) {
      errors.push(`${q.questionId}: source.type must be past_exam or original_exam`);
    }

    if (q.source?.year !== undefined && q.year !== undefined && q.source.year !== q.year) {
      errors.push(`${q.questionId}: year/source.year 불일치`);
    }
  }

  for (const p of patterns || []) {
    const cnt = (questions || []).filter((q) => q.patternId === p.patternId).length;
    if (p.frequency !== cnt) {
      errors.push(`${p.patternId}: frequency(${p.frequency}) != questions(${cnt})`);
    }
  }

  if (dbSet.id === 'mvp' && (questions || []).length !== 240) {
    errors.push(`MVP question count ${(questions || []).length}/240`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fallbackFrom: options.fallbackFrom || null,
  };
}

/**
 * 단일 DB 세트를 로드·검증한다.
 * @param {typeof DB_PATH_SETS.mvp} dbSet
 * @param {object} [options]
 */
async function loadDatabaseSet(dbSet, options = {}) {
  let master;
  let patterns;
  let questionPayload;
  let statistics;

  try {
    [master, patterns, questionPayload, statistics] = await Promise.all([
      loadJSON(MASTER_PATH),
      loadJSON(dbSet.patterns),
      loadJSON(dbSet.questions),
      loadJSON(dbSet.statistics),
    ]);
  } catch (error) {
    return {
      master: null,
      patterns: [],
      questions: [],
      statistics: [],
      valid: false,
      errors: [error.message],
      dbSet: dbSet.id,
      dbLabel: dbSet.label,
      paths: { master: MASTER_PATH, ...dbSet },
      fallbackUsed: Boolean(options.fallbackFrom),
      fallbackFrom: options.fallbackFrom || null,
    };
  }

  let questions = normalizeQuestionsPayload(questionPayload);
  if (dbSet.id === DEFAULT_DB_SET) {
    questions = applyQuestionCleanup(questions);
  }
  const validation = validateDatabasePayload(
    dbSet,
    { master, patterns, questions, statistics },
    options,
  );

  return {
    master,
    patterns,
    questions,
    statistics,
    valid: validation.valid,
    errors: validation.errors,
    dbSet: dbSet.id,
    dbLabel: dbSet.label,
    paths: {
      master: MASTER_PATH,
      patterns: dbSet.patterns,
      questions: dbSet.questions,
      statistics: dbSet.statistics,
    },
    fallbackUsed: Boolean(options.fallbackFrom),
    fallbackFrom: options.fallbackFrom || null,
  };
}

/**
 * Platform Database를 로드한다.
 * 기본 MVP → 실패 시 Phase 1 Freeze fallback.
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function loadPhase1Database(options = {}) {
  const preferred = options.dbSet || resolveDatabaseConfig();
  let result = await loadDatabaseSet(preferred);

  if (!result.valid && preferred.id === DEFAULT_DB_SET) {
    const fallback = DB_PATH_SETS[FALLBACK_DB_SET];
    const fallbackResult = await loadDatabaseSet(fallback, { fallbackFrom: preferred.id });
    if (fallbackResult.valid) {
      return fallbackResult;
    }
    result.errors.push(
      ...(fallbackResult.errors || []).map((message) => `[fallback] ${message}`),
    );
  }

  return result;
}

/**
 * @deprecated Phase 0 master — loadPhase1Database 사용
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

export {
  PHASE1_PATHS,
  CHOICE_SYMBOLS,
  DB_PATH_SETS,
  DEFAULT_DB_SET,
  FALLBACK_DB_SET,
  MASTER_PATH,
};
