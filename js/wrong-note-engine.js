/**
 * AI Exam Learning Platform v2
 * Wrong Answer Engine — 오답 목록·취약도·복습 (Phase 4)
 */

import { loadWrongAnswers } from './question-engine.js';
import { getQuestionById, getPatternById } from './data-loader.js';
import { aggregateWrongByPattern } from './pattern-engine.js';

/**
 * @typedef {object} WrongEntry
 * @property {string} questionId
 * @property {string} patternId
 * @property {number} wrongCount
 * @property {string} lastWrongAt
 * @property {string} lastWrongDate - lastWrongAt alias (docs/29)
 */

/**
 * 오답 목록 (Question·Pattern 메타 포함)
 * @param {array} questions
 * @param {array} patterns
 * @param {object} [wrongStore]
 */
export function getWrongAnswerEntries(questions, patterns, wrongStore = loadWrongAnswers()) {
  return Object.values(wrongStore.items || {})
    .map((item) => ({
      ...item,
      lastWrongDate: item.lastWrongAt,
      question: getQuestionById(questions, item.questionId),
      pattern: getPatternById(patterns, item.patternId),
    }))
    .filter((e) => e.question)
    .sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return new Date(b.lastWrongAt) - new Date(a.lastWrongAt);
    });
}

/**
 * Pattern 취약도 계산
 * @param {string} patternId
 * @param {object} wrongByPattern
 * @param {array} patterns
 */
export function getPatternVulnerability(patternId, wrongByPattern, patterns) {
  const pattern = getPatternById(patterns, patternId);
  const wrong = wrongByPattern[patternId];

  if (!wrong || !pattern) {
    return {
      patternId,
      pattern,
      level: 'NONE',
      label: '양호',
      score: 0,
      questionCount: 0,
      totalWrongCount: 0,
    };
  }

  const score = wrong.totalWrongCount * 10 + wrong.questionCount * 5;
  let level = 'LOW';
  let label = '주의';

  if (wrong.totalWrongCount >= 3 || score >= 35) {
    level = 'HIGH';
    label = '취약';
  } else if (wrong.totalWrongCount >= 2 || score >= 15) {
    level = 'MEDIUM';
    label = '보통';
  }

  return {
    patternId,
    pattern,
    level,
    label,
    score,
    questionCount: wrong.questionCount,
    totalWrongCount: wrong.totalWrongCount,
    items: wrong.items,
  };
}

/**
 * 취약 Pattern 목록 (오답 있는 Pattern만)
 * @param {array} patterns
 * @param {object} [wrongStore]
 */
export function getVulnerablePatterns(patterns, wrongStore = loadWrongAnswers()) {
  const wrongByPattern = aggregateWrongByPattern(wrongStore);

  return patterns
    .map((p) => getPatternVulnerability(p.patternId, wrongByPattern, patterns))
    .filter((v) => v.level !== 'NONE')
    .sort((a, b) => b.score - a.score);
}

/**
 * Wrong Note Dashboard 요약
 * @param {array} questions
 * @param {array} patterns
 */
export function buildWrongNoteSummary(questions, patterns) {
  const wrongStore = loadWrongAnswers();
  const entries = getWrongAnswerEntries(questions, patterns, wrongStore);
  const vulnerable = getVulnerablePatterns(patterns, wrongStore);
  const highCount = vulnerable.filter((v) => v.level === 'HIGH').length;

  const totalWrongAttempts = entries.reduce((sum, e) => sum + (e.wrongCount || 0), 0);

  return {
    totalQuestions: entries.length,
    totalWrongAttempts,
    vulnerablePatternCount: vulnerable.length,
    highVulnerabilityCount: highCount,
    entries,
    vulnerable,
    retryTarget: entries[0] || null,
  };
}

/**
 * @param {string} iso
 */
export function formatWrongDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * @param {string|null} patternId
 * @param {array} entries
 */
export function filterEntriesByPattern(entries, patternId) {
  if (!patternId) return entries;
  return entries.filter((e) => e.patternId === patternId);
}

/**
 * 복습 URL 생성
 * @param {object} entry
 */
export function buildRetryUrl(entry) {
  const pid = entry.patternId || entry.question?.patternId;
  const qid = entry.questionId;
  return `question.html?pattern=${encodeURIComponent(pid)}&id=${encodeURIComponent(qid)}&retry=1`;
}
