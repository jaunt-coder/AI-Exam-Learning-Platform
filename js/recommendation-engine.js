/**
 * AI Exam Learning Platform v2
 * Recommendation Engine — 개인화 학습 추천 (Phase 7)
 *
 * 입력: LocalStorage progress/wrongAnswers, statistics.json,
 *       question-overrides.js, pattern-profiles.js
 * data/*.json 읽기 전용 — Schema 변경 없음
 */

import { loadProgress, loadWrongAnswers } from './question-engine.js';
import {
  getPatternProgress,
  aggregateWrongByPattern,
  getStatisticsForPattern,
} from './pattern-engine.js';
import { getQuestionOverride } from './ai-tutor-content/question-overrides.js';
import { PATTERN_NAMES } from './ai-tutor-content/pattern-profiles.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import {
  SCORE_WEIGHTS,
  getTodayDateKey,
  daysSince,
  getImportanceScore,
  getWeaknessScore,
  getRecencyScore,
  getExamProbabilityScore,
  getQuestionTypeFactor,
  calculateRecommendationScore,
  calculateWrongPriority,
  isReviewDue,
  buildPatternReasons,
  buildQuestionReasons,
  sortByScoreDeterministic,
} from './recommendation-rules.js';

/**
 * @typedef {object} RecommendationLinkSet
 * @property {string} pattern
 * @property {string} question
 * @property {string} tutor
 * @property {string} wrongNote
 */

/**
 * @param {string} patternId
 * @returns {string}
 */
export function buildPatternUrl(patternId) {
  return `pattern.html?pattern=${encodeURIComponent(patternId)}`;
}

/**
 * @param {string} patternId
 * @param {string} questionId
 * @returns {string}
 */
export function buildQuestionUrl(patternId, questionId) {
  return `question.html?pattern=${encodeURIComponent(patternId)}&id=${encodeURIComponent(questionId)}&retry=1`;
}

/**
 * @param {string} questionId
 * @param {number|null} [selectedAnswer]
 * @returns {string}
 */
export function buildTutorUrl(questionId, selectedAnswer = null) {
  const base = `ai-tutor.html?id=${encodeURIComponent(questionId)}`;
  if (selectedAnswer !== null && selectedAnswer !== undefined) {
    return `${base}&selected=${encodeURIComponent(selectedAnswer)}`;
  }
  return base;
}

/**
 * @param {array} patterns
 * @param {array} questions
 * @param {array} statistics
 * @param {object} [options]
 */
export function buildRecommendationContext(
  patterns,
  questions,
  statistics,
  options = {},
) {
  const progress = options.progress ?? loadProgress();
  const wrongStore = options.wrongStore ?? loadWrongAnswers();
  const dateKey = options.dateKey ?? getTodayDateKey(options.referenceDate);
  const wrongByPattern = aggregateWrongByPattern(wrongStore);

  const questionMap = Object.fromEntries(questions.map((q) => [q.questionId, q]));
  const patternMap = Object.fromEntries(patterns.map((p) => [p.patternId, p]));

  const patternMetrics = patterns.map((pattern) => {
    const patternId = pattern.patternId;
    const prog = getPatternProgress(patternId, questions, progress);
    const wrong = wrongByPattern[patternId];
    const stat = getStatisticsForPattern(statistics, patternId);

    const patternQuestions = questions.filter((q) => q.patternId === patternId);
    let lastStudyAt = null;

    patternQuestions.forEach((q) => {
      const answered = progress.answered[q.questionId];
      if (answered?.answeredAt) {
        if (!lastStudyAt || answered.answeredAt > lastStudyAt) {
          lastStudyAt = answered.answeredAt;
        }
      }
    });

    let lastWrongAt = null;
    (wrong?.items || []).forEach((item) => {
      if (item.lastWrongAt && (!lastWrongAt || item.lastWrongAt > lastWrongAt)) {
        lastWrongAt = item.lastWrongAt;
      }
    });

    const daysSinceLastStudy = daysSince(lastStudyAt, dateKey);
    const daysSinceLastWrong = daysSince(lastWrongAt, dateKey);

    const importance = getImportanceScore(pattern, stat);
    const weakness = getWeaknessScore({
      correctPercent: prog.correctPercent,
      totalWrongCount: wrong?.totalWrongCount ?? 0,
      questionWrongCount: wrong?.questionCount ?? 0,
      answeredCount: prog.answered,
      totalQuestions: prog.total,
    });
    const recency = getRecencyScore({
      daysSinceLastStudy,
      daysSinceLastWrong,
      wrongCount: wrong?.totalWrongCount ?? 0,
    });
    const examProbability = getExamProbabilityScore(pattern, stat);

    const dominantType = getDominantQuestionType(patternQuestions);
    const questionTypeFactor = getQuestionTypeFactor(dominantType);

    const score = calculateRecommendationScore({
      importance,
      weakness,
      recency,
      examProbability,
      questionTypeFactor,
    });

    const reasons = buildPatternReasons({
      pattern,
      statistics: stat,
      correctPercent: prog.correctPercent,
      totalWrongCount: wrong?.totalWrongCount ?? 0,
      daysSinceLastStudy,
      importanceScore: importance,
    });

    return {
      patternId,
      pattern,
      statistics: stat,
      progress: prog,
      wrong,
      score,
      factors: { importance, weakness, recency, examProbability, questionTypeFactor },
      reasons,
      daysSinceLastStudy,
      daysSinceLastWrong,
      lastStudyAt,
      lastWrongAt,
      dominantQuestionType: dominantType,
    };
  });

  const reviewQuestions = Object.values(wrongStore.items || {})
    .map((item) => {
      const question = questionMap[item.questionId];
      const pattern = patternMap[item.patternId];
      const stat = getStatisticsForPattern(statistics, item.patternId);
      const override = getQuestionOverride(item.questionId);
      const importance = getImportanceScore(pattern, stat);
      const daysSinceWrong = daysSince(item.lastWrongAt, dateKey);
      const reviewDue = isReviewDue(daysSinceWrong, item.wrongCount || 1);
      const priority = calculateWrongPriority({
        wrongCount: item.wrongCount || 1,
        importanceScore: importance,
        daysSinceLastWrong: daysSinceWrong,
      });

      const questionType = override?.questionType ?? 'mixed';
      const reviewScore = Math.min(
        100,
        Math.round(
          priority * 10 +
            (reviewDue ? 25 : 0) +
            getQuestionTypeFactor(questionType) * 5,
        ),
      );

      const displayTitle =
        override?.title ||
        (question.question?.length > 48
          ? `${question.question.slice(0, 48)}…`
          : question.question) ||
        item.questionId;

      const reasons = buildQuestionReasons({
        wrongCount: item.wrongCount || 1,
        questionType,
        daysSinceWrong,
        importanceScore: importance,
        reviewDue,
      });

      return {
        questionId: item.questionId,
        patternId: item.patternId,
        question,
        pattern,
        wrongCount: item.wrongCount || 1,
        lastWrongAt: item.lastWrongAt,
        selectedAnswer: item.selectedAnswer,
        score: reviewScore,
        priority,
        reviewDue,
        questionType,
        reasons,
        title: displayTitle,
        links: buildQuestionLinks(item.patternId, item.questionId, item.selectedAnswer),
      };
    })
    .filter((entry) => entry.question);

  return {
    date: dateKey,
    patterns,
    questions,
    statistics,
    progress,
    wrongStore,
    patternMetrics,
    reviewQuestions,
    weights: { ...SCORE_WEIGHTS },
  };
}

/**
 * @param {array} patternQuestions
 * @returns {string}
 */
function getDominantQuestionType(patternQuestions) {
  const counts = {};

  patternQuestions.forEach((q) => {
    const type = getQuestionOverride(q.questionId)?.questionType ?? 'mixed';
    counts[type] = (counts[type] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'mixed';
}

/**
 * @param {string} patternId
 * @param {string} questionId
 * @param {number|null} selectedAnswer
 * @returns {RecommendationLinkSet}
 */
export function buildQuestionLinks(patternId, questionId, selectedAnswer = null) {
  return {
    pattern: buildPatternUrl(patternId),
    question: buildQuestionUrl(patternId, questionId),
    tutor: buildTutorUrl(questionId, selectedAnswer),
    wrongNote: `wrong-note.html?pattern=${encodeURIComponent(patternId)}`,
  };
}

/**
 * @param {object} context
 * @param {number} [limit]
 */
export function buildDailyRecommendations(context, limit = 3) {
  const ranked = sortByScoreDeterministic(context.patternMetrics);

  return ranked.slice(0, limit).map((metric, index) => ({
    type: 'daily',
    priority: index + 1,
    patternId: metric.patternId,
    title: metric.pattern?.name || PATTERN_NAMES[metric.patternId] || metric.patternId,
    score: metric.score,
    reasons: metric.reasons,
    factors: metric.factors,
    progress: metric.progress,
    links: {
      pattern: buildPatternUrl(metric.patternId),
      question: `question.html?pattern=${encodeURIComponent(metric.patternId)}`,
      tutor: 'ai-tutor.html',
      wrongNote: `wrong-note.html?pattern=${encodeURIComponent(metric.patternId)}`,
    },
  }));
}

/**
 * @param {object} context
 * @param {number} [limit]
 */
export function buildWeakPatternRecommendations(context, limit = 5) {
  const withWeakness = context.patternMetrics.filter(
    (m) => (m.wrong?.totalWrongCount ?? 0) > 0 || m.progress.correctPercent < 70,
  );

  const ranked = sortByScoreDeterministic(withWeakness);

  return ranked.slice(0, limit).map((metric, index) => ({
    type: 'weak-pattern',
    priority: index + 1,
    patternId: metric.patternId,
    title: metric.pattern?.name || PATTERN_NAMES[metric.patternId] || metric.patternId,
    score: metric.score,
    level:
      (metric.wrong?.totalWrongCount ?? 0) >= 3 || metric.progress.correctPercent < 50
        ? 'HIGH'
        : 'MEDIUM',
    reasons: metric.reasons,
    wrongCount: metric.wrong?.totalWrongCount ?? 0,
    correctPercent: metric.progress.correctPercent,
    links: {
      pattern: buildPatternUrl(metric.patternId),
      question: `question.html?pattern=${encodeURIComponent(metric.patternId)}`,
      tutor: 'ai-tutor.html',
      wrongNote: `wrong-note.html?pattern=${encodeURIComponent(metric.patternId)}`,
    },
  }));
}

/**
 * @param {object} context
 * @param {number} [limit]
 */
export function buildReviewRecommendations(context, limit = 8) {
  const dueFirst = context.reviewQuestions.filter((q) => q.reviewDue);
  const others = context.reviewQuestions.filter((q) => !q.reviewDue);
  const ranked = [
    ...sortByScoreDeterministic(dueFirst, 'score', 'questionId'),
    ...sortByScoreDeterministic(others, 'score', 'questionId'),
  ];

  return ranked.slice(0, limit).map((entry, index) => ({
    type: 'review',
    priority: index + 1,
    questionId: entry.questionId,
    patternId: entry.patternId,
    title: entry.title || entry.question?.title || entry.questionId,
    score: entry.score,
    wrongCount: entry.wrongCount,
    reviewDue: entry.reviewDue,
    questionType: entry.questionType,
    reasons: entry.reasons,
    links: entry.links,
  }));
}

/**
 * 전체 추천 리포트 (재현 가능 — dateKey 고정 시 동일 입력 → 동일 출력)
 * @param {array} patterns
 * @param {array} questions
 * @param {array} statistics
 * @param {object} [options]
 */
export function buildFullRecommendationReport(patterns, questions, statistics, options = {}) {
  const context = buildRecommendationContext(patterns, questions, statistics, options);

  const daily = buildDailyRecommendations(context, options.dailyLimit ?? 3);
  const weakPatterns = buildWeakPatternRecommendations(context, options.weakLimit ?? 5);
  const reviewQuestions = buildReviewRecommendations(context, options.reviewLimit ?? 8);

  const totalWrong = Object.keys(context.wrongStore.items || {}).length;
  const studiedPatterns = context.patternMetrics.filter((m) => m.progress.answered > 0).length;

  return {
    date: context.date,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPatterns: patterns.length,
      studiedPatterns,
      totalWrongQuestions: totalWrong,
      weights: context.weights,
    },
    daily,
    weakPatterns,
    reviewQuestions,
  };
}

/**
 * Recommendation 페이지 초기화
 */
export async function initRecommendationPage() {
  applyTheme();

  const loadingEl = document.getElementById('loading-state');
  const errorEl = document.getElementById('error-state');
  const sectionEl = document.getElementById('recommendation-section');
  const emptyEl = document.getElementById('empty-state');

  try {
    const { loadPhase1Database } = await import('./data-loader.js');
    const db = await loadPhase1Database();

    const report = buildFullRecommendationReport(
      db.patterns,
      db.questions,
      db.statistics,
    );

    if (loadingEl) loadingEl.hidden = true;

    const hasData =
      report.daily.length > 0 ||
      report.weakPatterns.length > 0 ||
      report.reviewQuestions.length > 0;

    if (!hasData) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (sectionEl) sectionEl.hidden = false;
    renderRecommendationPage(report);
  } catch (error) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      const msg = document.getElementById('error-message');
      if (msg) msg.textContent = error.message || '추천 데이터를 불러올 수 없습니다.';
    }
    console.error('[Recommendation]', error);
  }
}

function applyTheme() {
  document.documentElement.setAttribute(
    'data-theme',
    getItem(STORAGE_KEYS.THEME, 'light'),
  );
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderRecommendationPage(report) {
  renderSummary(report);
  renderDailyList(report.daily);
  renderWeakPatternList(report.weakPatterns);
  renderReviewList(report.reviewQuestions);
}

function renderSummary(report) {
  const el = document.getElementById('recommend-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="summary-item">
      <span class="summary-item__value">${report.date}</span>
      <span class="summary-item__label">오늘의 추천</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${report.daily.length}</span>
      <span class="summary-item__label">학습 Pattern</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value summary-item__value--warn">${report.weakPatterns.length}</span>
      <span class="summary-item__label">취약 Pattern</span>
    </div>
    <div class="summary-item">
      <span class="summary-item__value">${report.reviewQuestions.length}</span>
      <span class="summary-item__label">복습 문항</span>
    </div>
  `;

  const metaEl = document.getElementById('recommend-meta');
  if (metaEl) {
    metaEl.textContent = `학습 ${report.summary.studiedPatterns}/${report.summary.totalPatterns} Pattern · 오답 ${report.summary.totalWrongQuestions}문항 · 점수 가중치(중요 ${report.summary.weights.importance * 100}% / 취약 ${report.summary.weights.weakness * 100}% / 최근 ${report.summary.weights.recency * 100}% / 출제 ${report.summary.weights.examProbability * 100}%)`;
  }
}

function renderDailyList(items) {
  const listEl = document.getElementById('daily-list');
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = '<li><p class="section-desc">학습 기록이 쌓이면 오늘의 추천이 표시됩니다.</p></li>';
    return;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
    <li class="recommend-card recommend-card--daily">
      <div class="recommend-card__header">
        <span class="recommend-badge">#${item.priority}</span>
        <span class="recommend-score" title="Recommendation Score">${item.score}점</span>
      </div>
      <h4 class="recommend-card__title">${escapeHtml(item.title)}</h4>
      <ul class="recommend-reasons" aria-label="추천 이유">
        ${item.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      <div class="recommend-actions">
        <a href="${item.links.pattern}" class="button button--primary button--sm">Pattern 학습</a>
        <a href="${item.links.question}" class="button button--secondary button--sm">문제 풀이</a>
        <a href="${item.links.tutor}" class="button button--secondary button--sm">AI Tutor</a>
      </div>
    </li>
  `,
    )
    .join('');
}

function renderWeakPatternList(items) {
  const listEl = document.getElementById('weak-pattern-list');
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML =
      '<li><p class="section-desc">취약 Pattern이 없습니다. 훌륭합니다!</p></li>';
    return;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
    <li class="recommend-card recommend-card--weak recommend-card--${item.level.toLowerCase()}">
      <div class="recommend-card__header">
        <span class="vuln-badge vuln-badge--${item.level.toLowerCase()}">${item.level === 'HIGH' ? '취약' : '주의'}</span>
        <span class="recommend-score">${item.score}점</span>
      </div>
      <h4 class="recommend-card__title">${escapeHtml(item.title)}</h4>
      <p class="recommend-card__meta">오답 ${item.wrongCount}회 · 정답률 ${item.correctPercent}%</p>
      <ul class="recommend-reasons">
        ${item.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      <div class="recommend-actions">
        <a href="${item.links.pattern}" class="button button--danger button--sm">Pattern 복습</a>
        <a href="${item.links.wrongNote}" class="button button--secondary button--sm">오답 노트</a>
      </div>
    </li>
  `,
    )
    .join('');
}

function renderReviewList(items) {
  const listEl = document.getElementById('review-list');
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML =
      '<li><p class="section-desc">복습이 필요한 오답 문항이 없습니다.</p></li>';
    return;
  }

  listEl.innerHTML = items
    .map(
      (item) => `
    <li class="recommend-card recommend-card--review${item.reviewDue ? ' is-due' : ''}">
      <div class="recommend-card__header">
        ${item.reviewDue ? '<span class="recommend-badge recommend-badge--due">복습 필요</span>' : ''}
        <span class="recommend-type">${escapeHtml(item.questionType)}</span>
        <span class="recommend-score">${item.score}점</span>
      </div>
      <h4 class="recommend-card__title">${escapeHtml(item.title)}</h4>
      <p class="recommend-card__meta">오답 ${item.wrongCount}회 · ${escapeHtml(item.patternId)}</p>
      <ul class="recommend-reasons">
        ${item.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      <div class="recommend-actions">
        <a href="${item.links.question}" class="button button--primary button--sm">다시 풀기</a>
        <a href="${item.links.tutor}" class="button button--secondary button--sm">AI Tutor</a>
        <a href="${item.links.pattern}" class="button button--ghost button--sm">Pattern</a>
      </div>
    </li>
  `,
    )
    .join('');
}
