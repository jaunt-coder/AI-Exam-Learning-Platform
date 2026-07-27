/**
 * Sprint-14C — Evidence Builder
 * Reads Learning Engine / Storage state. Does not mutate algorithms.
 */

import { loadProgressDoc } from '../learning-engine/learning-storage.js';
import {
  computeQuestionMastery,
  computePatternMastery,
  getProgressSummary,
} from '../learning-engine/mastery-engine.js';
import { getDueReviews, getReviewStage } from '../learning-engine/review-engine.js';
import { loadWeaknessState } from '../weakness-service.js';
import { hasOverride, getOverride } from '../reviewer/override-service.js';
import { getCachedQualityScore } from '../quality/quality-engine.js';
import { readEvidencePad } from './evidence-storage.js';
import { daysSince, clamp } from './evidence-utils.js';
import { computeEvidenceScore, estimatedBenefitStars } from './evidence-score.js';

function bullet(ok, text) {
  return { ok: Boolean(ok), text: String(text) };
}

function buildWrongHistory(questionId) {
  const q = loadProgressDoc().byQuestion[questionId] || {};
  const incorrect = Number(q.incorrect) || 0;
  const correct = Number(q.correct) || 0;
  const attempts = Number(q.attempts) || incorrect + correct;
  const lastDays = daysSince(q.lastAttemptAt);
  const recentWrong = incorrect > 0 && (lastDays == null || lastDays <= 14);
  const consecutiveHint = incorrect >= 3 && correct === 0;
  const bullets = [
    bullet(incorrect > 0, `누적 오답 ${incorrect}회`),
    bullet(recentWrong, recentWrong ? `최근 오답 (마지막 ${lastDays ?? '?'}일 전)` : '최근 오답 없음'),
    bullet(consecutiveHint, consecutiveHint ? '연속 오답 패턴' : '연속 오답 아님'),
    bullet(correct > 0, correct > 0 ? `최근 정답 누적 ${correct}회` : '정답 기록 없음'),
  ];
  const weight = clamp(
    (incorrect > 0 ? 12 : 0) + (recentWrong ? 10 : 0) + (consecutiveHint ? 8 : 0),
    0,
    30,
  );
  return { type: 'WrongHistory', bullets, weight, incorrect, correct, attempts, lastDays };
}

function buildMasteryEvidence(questionId, patternId, questions = []) {
  const qm = computeQuestionMastery(questionId, patternId);
  const qids = questions
    .filter((q) => (q.patternId || q.primaryPattern) === patternId)
    .map((q) => q.questionId);
  const pm = computePatternMastery(patternId, qids.length ? qids : [questionId]);
  const low = qm.score < 60 || pm.score < 60;
  const bullets = [
    bullet(true, `Question Mastery ${qm.score}%`),
    bullet(true, `Pattern Mastery ${pm.score}%`),
    bullet(low, low ? 'Mastery 60 미만' : 'Mastery 양호'),
  ];
  const weight = clamp(low ? 25 - Math.floor(qm.score / 10) : Math.floor((100 - qm.score) / 8), 0, 25);
  return { type: 'Mastery', bullets, weight, question: qm.score, pattern: pm.score, chapter: Math.round((qm.score + pm.score) / 2) };
}

function buildConfidenceEvidence(patternId) {
  const weak = loadWeaknessState().patterns || [];
  const entry = weak.find((p) => p.patternId === patternId);
  const signals = entry?.activeSignals || entry?.signals || [];
  const high = signals.filter((s) => s.severity === 'high').length;
  const medium = signals.filter((s) => s.severity === 'medium').length;
  let level = 'High';
  if (high >= 2) level = 'Very Low';
  else if (high >= 1) level = 'Low';
  else if (medium >= 1) level = 'Medium';
  const low = level === 'Low' || level === 'Very Low';
  const bullets = [
    bullet(true, `Confidence ${level}`),
    bullet(signals.length > 0, signals.length ? `Weakness signals ${signals.length}` : 'Weakness signal 없음'),
  ];
  const weight = clamp(level === 'Very Low' ? 20 : level === 'Low' ? 16 : level === 'Medium' ? 10 : 4, 0, 20);
  return { type: 'Confidence', bullets, weight, level, low };
}

function buildReviewEvidence(questionId) {
  const stage = getReviewStage(questionId);
  const due = getDueReviews().some((r) => r.questionId === questionId);
  const overdue = due && stage?.nextReviewAt && stage.nextReviewAt < new Date().toISOString();
  const bullets = [
    bullet(due, due ? '오늘 복습 대상' : '오늘 복습 대상 아님'),
    bullet(overdue, overdue ? 'Overdue' : 'Overdue 아님'),
    bullet(Boolean(stage), stage ? `Review Stage ${stage.stage ?? 0} (${stage.intervalDays ?? '?'}일)` : 'Review Cycle 미등록'),
  ];
  const weight = clamp((due ? 10 : 0) + (overdue ? 5 : 0), 0, 15);
  return { type: 'ReviewCycle', bullets, weight, due, overdue, stage: stage?.stage ?? null };
}

function buildRecommendationReason(rec = {}) {
  const code = rec.reasonCode || 'PRIORITY';
  const map = {
    RECENT_WRONG: 'Wrong',
    LOW_MASTERY: 'Mastery',
    LOW_CONFIDENCE: 'Confidence',
    PATTERN_DIVERSITY: 'Diversity',
    REVIEW_DUE: 'Review',
  };
  const label = map[code] || 'Priority';
  const bullets = [
    bullet(true, `Reason ${label}`),
    bullet(true, rec.reason || '학습 전략 추천'),
    bullet(true, `Priority ${rec.priority ?? '—'}`),
  ];
  return { type: 'RecommendationReason', bullets, code, label, priority: rec.priority ?? null };
}

function buildPatternEvidence(patternId, questions = []) {
  const related = questions.filter((q) => (q.patternId || q.primaryPattern) === patternId);
  const years = related.map((q) => Number(q.year || q.examYear || 0)).filter(Boolean);
  const recentYear = years.length ? Math.max(...years) : null;
  const frequency = related.length;
  const bullets = [
    bullet(Boolean(patternId), `Pattern ${patternId || '—'}`),
    bullet(frequency > 0, `관련 문항 ${frequency}개`),
    bullet(recentYear != null, recentYear ? `최근 출제연도 ${recentYear}` : '출제연도 정보 없음'),
    bullet(frequency >= 3, frequency >= 3 ? '재사용도 높음' : '재사용도 보통'),
  ];
  const weight = clamp((frequency >= 5 ? 6 : frequency >= 3 ? 4 : 2) + (recentYear && recentYear >= 2020 ? 4 : 0), 0, 10);
  return { type: 'PatternEvidence', bullets, weight, frequency, recentYear };
}

function buildStudyEvidence() {
  const progress = getProgressSummary();
  const last = (progress.daily || []).slice(-1)[0];
  const bullets = [
    bullet(progress.totalAttempts > 0, `총 풀이 ${progress.totalAttempts}회`),
    bullet(true, `Accuracy ${Math.round((progress.accuracy || 0) * 100)}%`),
    bullet(Boolean(last), last ? `최근 학습일 ${last.date} (${last.attempts}문항)` : '최근 학습 없음'),
  ];
  return { type: 'StudyEvidence', bullets, accuracy: progress.accuracy, totalAttempts: progress.totalAttempts };
}

function buildQualityEvidence(questionId) {
  const ov = hasOverride(questionId);
  const override = ov ? getOverride(questionId) : null;
  const quality = getCachedQualityScore(questionId);
  const padHits = readEvidencePad().filter(
    (e) => (e.questionId || e.question_id) === questionId,
  ).length;
  const bullets = [
    bullet(ov, ov ? 'Override 존재' : 'Override 없음'),
    bullet(quality != null, quality != null ? `Quality Score ${quality}` : 'Quality Score 미산출'),
    bullet(padHits > 0, padHits > 0 ? `Evidence Pad ${padHits}건` : 'Evidence Pad 기록 없음'),
    bullet(Boolean(override?.source), override?.source ? `Override source ${override.source}` : 'AI Recovery/Human Review 미확인'),
  ];
  return {
    type: 'QualityEvidence',
    bullets,
    hasOverride: ov,
    qualityScore: quality,
    padHits,
  };
}

/**
 * Build full evidence pack for one recommendation (explain only).
 */
export function buildEvidenceForRecommendation(rec = {}, questions = []) {
  const questionId = rec.questionId || null;
  const patternId = rec.patternId || null;
  const qid = questionId || (patternId
    ? (questions.find((q) => (q.patternId || q.primaryPattern) === patternId)?.questionId || null)
    : null);
  const pid = patternId
    || questions.find((q) => q.questionId === qid)?.patternId
    || questions.find((q) => q.questionId === qid)?.primaryPattern
    || null;

  const wrong = qid ? buildWrongHistory(qid) : { type: 'WrongHistory', bullets: [bullet(false, '문항 미지정')], weight: 0 };
  const mastery = qid && pid
    ? buildMasteryEvidence(qid, pid, questions)
    : { type: 'Mastery', bullets: [bullet(false, 'Mastery 미산출')], weight: 0, question: 0, pattern: 0, chapter: 0 };
  const confidence = pid
    ? buildConfidenceEvidence(pid)
    : { type: 'Confidence', bullets: [bullet(false, 'Confidence 미산출')], weight: 0, level: 'Medium', low: false };
  const review = qid
    ? buildReviewEvidence(qid)
    : { type: 'ReviewCycle', bullets: [bullet(false, 'Review 미산출')], weight: 0 };
  const reason = buildRecommendationReason(rec);
  const pattern = buildPatternEvidence(pid, questions);
  const study = buildStudyEvidence();
  const quality = qid
    ? buildQualityEvidence(qid)
    : { type: 'QualityEvidence', bullets: [bullet(false, 'Quality 미산출')], hasOverride: false };

  const score = computeEvidenceScore({
    wrong: wrong.weight,
    mastery: mastery.weight,
    confidence: confidence.weight,
    review: review.weight,
    pattern: pattern.weight,
  });

  const checklist = [
    ...wrong.bullets,
    ...mastery.bullets,
    ...confidence.bullets,
    ...review.bullets,
    ...reason.bullets,
    ...pattern.bullets,
  ].filter((b) => b.ok);

  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-14C',
    evidenceId: `ev_${rec.recommendationId || qid || pid || 'na'}`,
    recommendationId: rec.recommendationId || null,
    questionId: qid,
    patternId: pid,
    types: {
      wrongHistory: wrong,
      mastery,
      confidence,
      reviewCycle: review,
      recommendationReason: reason,
      patternEvidence: pattern,
      studyEvidence: study,
      qualityEvidence: quality,
    },
    checklist,
    score,
    estimatedBenefit: estimatedBenefitStars(score.total),
    generatedAt: new Date().toISOString(),
  };
}

export const EVIDENCE_TYPE_COUNT = 8;

export default {
  buildEvidenceForRecommendation,
  EVIDENCE_TYPE_COUNT,
};
