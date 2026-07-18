/**
 * AI Exam Learning Platform v2
 * Question Solving Engine — 채점·진행·오답·암기포인트 (Phase 2)
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { getChoiceLabel } from './data-loader.js';

const PROGRESS_VERSION = 1;
const WRONG_ANSWERS_VERSION = 1;

/** Pattern별 암기 포인트 (DB solution.memoryPoint 비어 있을 때 UI fallback — DB 미변경) */
const PATTERN_MEMORY_HINTS = {
  ACC_INV_001: '소유권 기준: FOB 선적/도착, 위탁·적송·시송 여부에 따라 기말재고 포함 여부를 판단한다.',
  ACC_INV_003: '재고원가 = 매입가 + 취득 관련 부대비용(운반비·하역비·보험료). VAT·매입할인 처리 구분.',
  ACC_INV_004: '매출원가 = 기초재고 + 당기매입 - 기말재고 (PER법). 기말재고 실사 후 역산.',
  ACC_INV_005: 'PER법 = 기말 실지재고 + 매출원가 역산. PR법 = 매 거래 잔액 확인.',
  ACC_INV_006: 'FIFO = 먼저 들어온 원가부터 출고. 총평균 = (기초원가+매입원가)÷(기초수량+매입수량).',
  ACC_INV_007: 'LCM = min(취득원가, 순매가액-추가원가). 순실현가능가치 하향 시 재고자산감소손실.',
};

function createEmptyProgress() {
  return {
    version: PROGRESS_VERSION,
    answered: {},
    stats: { totalAnswered: 0, totalCorrect: 0 },
  };
}

function createEmptyWrongAnswers() {
  return { version: WRONG_ANSWERS_VERSION, items: {} };
}

export function loadProgress() {
  const data = getItem(STORAGE_KEYS.PROGRESS, null);
  if (!data || typeof data !== 'object') {
    return createEmptyProgress();
  }
  return {
    ...createEmptyProgress(),
    ...data,
    answered: data.answered || {},
    stats: { ...createEmptyProgress().stats, ...(data.stats || {}) },
  };
}

export function saveProgress(progress) {
  setItem(STORAGE_KEYS.PROGRESS, progress);
}

export function loadWrongAnswers() {
  const data = getItem(STORAGE_KEYS.WRONG_ANSWERS, null);
  if (!data || typeof data !== 'object') {
    return createEmptyWrongAnswers();
  }
  return {
    ...createEmptyWrongAnswers(),
    ...data,
    items: data.items || {},
  };
}

export function saveWrongAnswers(wrongAnswers) {
  setItem(STORAGE_KEYS.WRONG_ANSWERS, wrongAnswers);
}

/**
 * @param {object} question
 * @param {object|null} pattern
 */
export function getMemoryPoint(question, pattern = null) {
  const fromDb = question.solution?.memoryPoint?.trim();
  if (fromDb) return fromDb;

  if (PATTERN_MEMORY_HINTS[question.patternId]) {
    return PATTERN_MEMORY_HINTS[question.patternId];
  }

  if (pattern?.name) {
    return `${pattern.name} — ${pattern.grade}급 Pattern (빈도 ${pattern.frequency}회)`;
  }

  return '해당 Pattern의 핵심 개념을 정리해 두세요.';
}

export function gradeAnswer(question, selectedAnswer) {
  const correctAnswer = Number(question.answer);
  return {
    correct: selectedAnswer === correctAnswer,
    selectedAnswer,
    correctAnswer,
  };
}

/**
 * 오답 시 wrongAnswers LocalStorage에 저장 / 정답 시 제거
 * @param {object} question
 * @param {object} result
 */
export function saveWrongAnswer(question, result) {
  if (result.correct) {
    return removeWrongAnswer(question.questionId);
  }

  const store = loadWrongAnswers();
  const prev = store.items[question.questionId];
  store.items[question.questionId] = {
    questionId: question.questionId,
    patternId: question.patternId,
    selectedAnswer: result.selectedAnswer,
    correctAnswer: result.correctAnswer,
    year: question.year,
    wrongCount: (prev?.wrongCount || 0) + 1,
    lastWrongAt: new Date().toISOString(),
  };

  saveWrongAnswers(store);
  return store;
}

/**
 * 정답 처리 시 오답 노트에서 제거
 * @param {string} questionId
 */
export function removeWrongAnswer(questionId) {
  const store = loadWrongAnswers();
  if (store.items[questionId]) {
    delete store.items[questionId];
    saveWrongAnswers(store);
  }
  return store;
}

export function recordAttempt(question, result) {
  const progress = loadProgress();
  const prev = progress.answered[question.questionId];

  progress.answered[question.questionId] = {
    correct: result.correct,
    selectedAnswer: result.selectedAnswer,
    answeredAt: new Date().toISOString(),
    patternId: question.patternId,
    year: question.year,
  };

  if (!prev) {
    progress.stats.totalAnswered += 1;
    if (result.correct) progress.stats.totalCorrect += 1;
  } else if (!prev.correct && result.correct) {
    progress.stats.totalCorrect += 1;
  } else if (prev.correct && !result.correct) {
    progress.stats.totalCorrect = Math.max(0, progress.stats.totalCorrect - 1);
  }

  saveProgress(progress);
  saveWrongAnswer(question, result);
  return progress;
}

export function getWrongAnswerCount() {
  return Object.keys(loadWrongAnswers().items).length;
}

export function createSessionScore() {
  return { answered: 0, correct: 0 };
}

export function updateSessionScore(session, correct) {
  session.answered += 1;
  if (correct) session.correct += 1;
  return session;
}

export function formatSessionScore(session) {
  if (session.answered === 0) return '0 / 0 (0%)';
  const pct = Math.round((session.correct / session.answered) * 100);
  return `${session.correct} / ${session.answered} (${pct}%)`;
}

export function getSolutionDisplay(question) {
  const sol = question.solution || {};
  const parts = [];

  if (sol.summary && !/^\d+$/.test(String(sol.summary).trim())) {
    parts.push(sol.summary);
  }

  const raw = sol.explanation || sol.calculationProcess || '';
  const cleaned = raw
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (/^\d+$/.test(t)) return false;
      if (/^(CHAPTER|감정평가사|연도별|스터디파이터|년도)/.test(t)) return false;
      if (/^\d{1,2}$/.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();

  if (cleaned) parts.push(cleaned);
  if (sol.algorithm && sol.algorithm.length > 20) parts.push(sol.algorithm);

  return (
    parts.join('\n\n') ||
    'PDF 추출 해설입니다. 상세 원문은 originalQuestion 필드를 참고하세요.'
  );
}

export function getResultMessage(result) {
  if (result.correct) {
    return `정답입니다! (${getChoiceLabel(result.correctAnswer)})`;
  }
  return `오답입니다. 정답: ${getChoiceLabel(result.correctAnswer)} (선택: ${getChoiceLabel(result.selectedAnswer)})`;
}

/**
 * Pattern ID로 문항 필터
 * @param {array} questions
 * @param {string} patternId
 */
export function filterQuestionsByPattern(questions, patternId) {
  return questions.filter((q) => q.patternId === patternId);
}
