/**
 * AI Exam Learning Platform v2
 * Recommendation Rules — 점수 가중치·요인 계산 (Phase 7)
 *
 * docs/08-recommendation-engine-spec.md
 * docs/27-learning-algorithm-spec.md
 */

/** @typedef {'calculation'|'concept'|'incorrect_statement'|'mixed'} QuestionType */

export const SCORE_WEIGHTS = {
  importance: 0.4,
  weakness: 0.3,
  recency: 0.2,
  examProbability: 0.1,
};

export const GRADE_IMPORTANCE = {
  S: 100,
  A: 80,
  B: 60,
  C: 40,
};

export const PRIORITY_SCORE = {
  HIGH: 100,
  MEDIUM: 65,
  LOW: 35,
};

export const QUESTION_TYPE_FACTOR = {
  calculation: 1.15,
  mixed: 1.1,
  incorrect_statement: 1.0,
  concept: 0.95,
};

/** 망각 곡선 복습 주기 (일) — docs/08 §13 */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {Date|string|number} [date]
 * @returns {string} YYYY-MM-DD (로컬)
 */
export function getTodayDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {string|null|undefined} iso
 * @param {string} [referenceDateKey]
 * @returns {number|null}
 */
export function daysSince(iso, referenceDateKey = getTodayDateKey()) {
  if (!iso) return null;
  try {
    const then = new Date(iso);
    const ref = new Date(`${referenceDateKey}T12:00:00`);
    return Math.floor((ref - then) / MS_PER_DAY);
  } catch {
    return null;
  }
}

/**
 * Pattern 중요도 점수 (0~100)
 * @param {object|null} pattern
 * @param {object|null} statistics
 */
export function getImportanceScore(pattern, statistics) {
  if (!pattern) return 0;

  const gradeBase = GRADE_IMPORTANCE[pattern.grade] ?? 50;
  const importanceNorm = Math.min(100, Math.max(0, pattern.importance || 70));
  const statGrade = statistics?.grade ? GRADE_IMPORTANCE[statistics.grade] ?? gradeBase : gradeBase;

  return Math.round(gradeBase * 0.45 + importanceNorm * 0.35 + statGrade * 0.2);
}

/**
 * 취약도 점수 (0~100)
 * @param {object} params
 */
export function getWeaknessScore({
  correctPercent = 100,
  totalWrongCount = 0,
  questionWrongCount = 0,
  answeredCount = 0,
  totalQuestions = 0,
}) {
  let score = 0;

  if (totalWrongCount > 0) {
    score += Math.min(50, totalWrongCount * 12 + questionWrongCount * 4);
  }

  if (answeredCount > 0 && correctPercent < 100) {
    score += Math.round((100 - correctPercent) * 0.4);
  }

  if (totalQuestions > 0 && answeredCount === 0) {
    score += 25;
  } else if (totalQuestions > 0 && answeredCount < totalQuestions) {
    const gap = totalQuestions - answeredCount;
    score += Math.min(20, gap * 4);
  }

  return Math.min(100, Math.round(score));
}

/**
 * 최근성 점수 (0~100) — 최근 오답·오래된 학습일수록 높음
 * @param {object} params
 */
export function getRecencyScore({ daysSinceLastStudy, daysSinceLastWrong, wrongCount = 0 }) {
  let score = 0;

  if (daysSinceLastWrong !== null && daysSinceLastWrong >= 0) {
    const wrongRecency = Math.max(0, 100 - daysSinceLastWrong * 8);
    score += wrongRecency * 0.55;
    if (wrongCount >= 2 && daysSinceLastWrong <= 7) {
      score += 15;
    }
  }

  if (daysSinceLastStudy !== null && daysSinceLastStudy >= 0) {
    if (daysSinceLastStudy >= 14) {
      score += Math.min(35, 10 + daysSinceLastStudy * 0.8);
    } else if (daysSinceLastStudy >= 7) {
      score += 20;
    } else if (daysSinceLastStudy <= 1) {
      score += 5;
    }
  } else {
    score += 30;
  }

  return Math.min(100, Math.round(score));
}

/**
 * 출제 가능성 점수 (0~100)
 * @param {object|null} pattern
 * @param {object|null} statistics
 */
export function getExamProbabilityScore(pattern, statistics) {
  if (!pattern && !statistics) return 0;

  const priority = PRIORITY_SCORE[statistics?.priority] ?? PRIORITY_SCORE.MEDIUM;
  const freq = pattern?.frequency ?? statistics?.totalCount ?? 0;
  const freqNorm = Math.min(100, freq * 7);
  const recentYears = statistics?.recentYears?.length ?? 0;
  const recentBoost = Math.min(30, recentYears * 8);

  return Math.min(100, Math.round(priority * 0.5 + freqNorm * 0.35 + recentBoost * 0.15));
}

/**
 * @param {QuestionType|string|null|undefined} questionType
 * @returns {number}
 */
export function getQuestionTypeFactor(questionType) {
  if (!questionType) return 1;
  return QUESTION_TYPE_FACTOR[questionType] ?? 1;
}

/**
 * 가중 Recommendation Score (0~100)
 * @param {object} factors
 */
export function calculateRecommendationScore(factors) {
  const {
    importance = 0,
    weakness = 0,
    recency = 0,
    examProbability = 0,
    questionTypeFactor = 1,
  } = factors;

  const weighted =
    importance * SCORE_WEIGHTS.importance +
    weakness * SCORE_WEIGHTS.weakness +
    recency * SCORE_WEIGHTS.recency +
    examProbability * SCORE_WEIGHTS.examProbability;

  return Math.min(100, Math.round(weighted * questionTypeFactor));
}

/**
 * 오답 복습 우선순위 — docs/08 §14
 * @param {object} params
 */
export function calculateWrongPriority({ wrongCount, importanceScore, daysSinceLastWrong }) {
  const recencyWeight =
    daysSinceLastWrong === null
      ? 1
      : Math.max(0.5, 1.2 - daysSinceLastWrong * 0.04);

  return Math.round(wrongCount * (importanceScore / 100) * recencyWeight * 100) / 100;
}

/**
 * @param {number} wrongCount
 * @returns {number}
 */
export function getReviewIntervalDays(wrongCount) {
  const idx = Math.min(Math.max(wrongCount, 1) - 1, REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[idx];
}

/**
 * @param {number} daysSinceWrong
 * @param {number} wrongCount
 * @returns {boolean}
 */
export function isReviewDue(daysSinceWrong, wrongCount) {
  if (daysSinceWrong === null || wrongCount < 1) return false;
  return daysSinceWrong >= getReviewIntervalDays(wrongCount);
}

/**
 * @param {object} params
 * @returns {string[]}
 */
export function buildPatternReasons({
  pattern,
  statistics,
  correctPercent,
  totalWrongCount,
  daysSinceLastStudy,
  importanceScore,
}) {
  const reasons = [];

  if (pattern?.grade === 'S') {
    reasons.push('S급 핵심 Pattern');
  } else if (pattern?.grade === 'A') {
    reasons.push('A급 중요 Pattern');
  }

  if (statistics?.priority === 'HIGH') {
    reasons.push('출제 빈도 HIGH');
  }

  if (totalWrongCount >= 3) {
    reasons.push(`최근 ${totalWrongCount}회 오답`);
  } else if (totalWrongCount >= 1) {
    reasons.push('오답 기록 있음');
  }

  if (correctPercent < 60 && correctPercent >= 0) {
    reasons.push(`정답률 ${correctPercent}%`);
  }

  if (daysSinceLastStudy === null) {
    reasons.push('아직 학습하지 않은 Pattern');
  } else if (daysSinceLastStudy >= 14) {
    reasons.push(`마지막 학습 ${daysSinceLastStudy}일 전`);
  } else if (daysSinceLastStudy >= 7) {
    reasons.push('1주 이상 복습 간격');
  }

  if (importanceScore >= 85) {
    reasons.push('Pattern 중요도 상위');
  }

  return reasons.slice(0, 4);
}

/**
 * @param {object} params
 * @returns {string[]}
 */
export function buildQuestionReasons({
  wrongCount,
  questionType,
  daysSinceWrong,
  importanceScore,
  reviewDue,
}) {
  const reasons = [];

  if (wrongCount >= 3) {
    reasons.push(`반복 실패 ${wrongCount}회`);
  } else if (wrongCount >= 2) {
    reasons.push(`오답 ${wrongCount}회`);
  } else {
    reasons.push('오답 1회');
  }

  if (reviewDue) {
    reasons.push('복습 주기 도래');
  }

  if (daysSinceWrong !== null && daysSinceWrong <= 3) {
    reasons.push('최근 오답');
  }

  if (questionType === 'calculation') {
    reasons.push('계산형 — AI Tutor 권장');
  } else if (questionType === 'mixed') {
    reasons.push('혼합형 문항');
  }

  if (importanceScore >= 80) {
    reasons.push('고중요 Pattern 소속');
  }

  return reasons.slice(0, 4);
}

/**
 * 결정적 정렬 — 동점 시 patternId/questionId 오름차순
 * @param {array} items
 * @param {string} scoreKey
 * @param {string} idKey
 */
export function sortByScoreDeterministic(items, scoreKey = 'score', idKey = 'patternId') {
  return [...items].sort((a, b) => {
    const scoreDiff = (b[scoreKey] ?? 0) - (a[scoreKey] ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return String(a[idKey] || '').localeCompare(String(b[idKey] || ''));
  });
}
