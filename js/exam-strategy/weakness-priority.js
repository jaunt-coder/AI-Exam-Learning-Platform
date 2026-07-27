/**
 * Sprint-16A — Pattern Risk Score + Weakness Priority
 * Reads Mastery / Mistake / Review — does not change LE formulas.
 */

import {
  computePatternMastery,
  getProgressSummary,
} from '../learning-engine/mastery-engine.js';
import { getDueReviews } from '../learning-engine/review-engine.js';
import { loadProgressDoc } from '../learning-engine/learning-storage.js';
import { loadMistakeProfile } from '../solution-engine/cache.js';
import { loadWeakMemoryDoc } from '../smart-tutor/cache.js';
import { persistPatternRisk } from './strategy-storage.js';

const RISK_LABELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MID: 'MID',
  LOW: 'LOW',
};

const RISK_REASON_COPY = {
  AVG_COST_ERROR: 'FIFO 계산 오류',
  FIFO_ERROR: 'FIFO 계산 오류',
  CALC_ERROR: '계산 순서 누락',
  UNIT_ERROR: '계산 순서 누락',
  CONDITION_MISS: '조건 누락',
  CONCEPT_GAP: '개념 착각',
  METHOD_SWAP: 'Pattern 혼동',
  ACC_INV_001: '소유권 판단 오류',
  ACC_INV_003: '재고원가 포함 오류',
  ACC_INV_004: '매출원가 항등식 오류',
  ACC_INV_005: 'PER/PR 혼동',
  ACC_INV_006: 'FIFO 계산 오류',
  ACC_INV_007: '손상차손·LCM 처리',
};

function clamp(n, min = 0, max = 100) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function classifyRisk(score) {
  if (score >= 75) return RISK_LABELS.CRITICAL;
  if (score >= 55) return RISK_LABELS.HIGH;
  if (score >= 35) return RISK_LABELS.MID;
  return RISK_LABELS.LOW;
}

function patternName(pattern) {
  return pattern?.name || pattern?.patternId || 'Pattern';
}

/**
 * Compute risk for one pattern.
 */
export function computePatternRiskScore(pattern, questionIds = []) {
  const patternId = pattern?.patternId || '';
  const mastery = computePatternMastery(patternId, questionIds);
  const progress = loadProgressDoc();
  const pRow = progress.byPattern?.[patternId] || {};
  const recentWrong = Number(pRow.incorrect) || 0;
  const attempts = Number(pRow.attempts) || 0;

  const due = getDueReviews().filter((r) => {
    /* due reviews are question-level; approximate by questionIds */
    return questionIds.includes(r.questionId);
  });
  const reviewMissed = due.length > 0;

  const weakDoc = loadWeakMemoryDoc();
  const weakBanner = weakDoc.banners?.[patternId];
  const weakBoost = weakBanner?.active ? 15 : 0;

  const mistakeProfile = loadMistakeProfile();
  const byPattern = mistakeProfile.byPattern?.[patternId] || {};
  const mistakeHits = Object.values(byPattern).reduce((s, n) => s + (Number(n) || 0), 0);

  /* Risk ↑ when mastery ↓, recent wrong ↑, review missed, weak memory */
  const masteryGap = 100 - (Number(mastery.score) || 0);
  const wrongIntensity = Math.min(40, recentWrong * 8 + mistakeHits * 3);
  const reviewPenalty = reviewMissed ? 15 : 0;

  const riskScore = clamp(
    masteryGap * 0.45 + wrongIntensity + reviewPenalty + weakBoost,
  );

  const risk = classifyRisk(riskScore);
  const shortName = patternName(pattern).split(/[·・]/)[0].trim() || patternId;

  return {
    patternId,
    name: patternName(pattern),
    shortName,
    mastery: Number(mastery.score) || 0,
    recentWrong,
    attempts,
    reviewMissed,
    mistakeHits,
    riskScore,
    risk,
    reasons: [
      `Mastery ${Number(mastery.score) || 0}`,
      `최근 오류 ${recentWrong}회`,
      reviewMissed ? '복습 미실시' : '복습 정상',
    ],
  };
}

/**
 * Build all pattern risks + TOP list.
 */
export function buildPatternRiskMap(questions = [], patterns = []) {
  const byPatternQ = {};
  for (const q of questions) {
    if (!q?.patternId) continue;
    if (!byPatternQ[q.patternId]) byPatternQ[q.patternId] = [];
    byPatternQ[q.patternId].push(q.questionId);
  }

  const list = (patterns.length ? patterns : Object.keys(byPatternQ).map((id) => ({ patternId: id })))
    .map((p) => computePatternRiskScore(p, byPatternQ[p.patternId] || []))
    .sort((a, b) => b.riskScore - a.riskScore);

  const byPattern = {};
  for (const row of list) byPattern[row.patternId] = row;

  const topRisks = list.slice(0, 5).map((row, i) => ({
    rank: i + 1,
    patternId: row.patternId,
    label: RISK_REASON_COPY[row.patternId] || row.shortName,
    risk: row.risk,
    riskScore: row.riskScore,
    mastery: row.mastery,
    recentWrong: row.recentWrong,
  }));

  /* Enrich top risks from mistake diagnosis codes when available */
  const profile = loadMistakeProfile();
  const codeRows = (profile.heatmap || Object.values(profile.byCode || {}))
    .slice()
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
    .slice(0, 5);

  const dangerTop5 = codeRows.length
    ? codeRows.map((c, i) => ({
        rank: i + 1,
        code: c.code,
        label: RISK_REASON_COPY[c.code] || c.label || c.code,
        count: Number(c.count) || 0,
      }))
    : topRisks.map((t) => ({
        rank: t.rank,
        code: t.patternId,
        label: t.label,
        count: t.recentWrong,
      }));

  const payload = {
    byPattern,
    list,
    topRisks,
    dangerTop5,
    generatedAt: new Date().toISOString(),
  };

  persistPatternRisk(payload);
  return payload;
}

/**
 * Prioritize weaknesses for strategy advice.
 */
export function prioritizeWeaknesses(riskMap, limit = 5) {
  const list = (riskMap?.list || []).slice(0, limit);
  return list.map((row, i) => ({
    rank: i + 1,
    patternId: row.patternId,
    label: row.shortName || row.name,
    reason:
      row.recentWrong >= 3
        ? `최근 오류 ${row.recentWrong}회 · Mastery ${row.mastery}%`
        : `Mastery ${row.mastery}% · Risk ${row.risk}`,
    risk: row.risk,
    mastery: row.mastery,
    recentWrong: row.recentWrong,
    recommendedAction:
      row.patternId === 'ACC_INV_006'
        ? 'FIFO 복습'
        : `${row.shortName} 집중 연습`,
  }));
}

/**
 * Chapter / topic mastery map for Dashboard.
 * Uses real chapter/pattern data only (no fake subject scores).
 */
export function buildMasteryMap(questions = [], patterns = []) {
  const byChapter = {};
  const byPatternQ = {};

  for (const q of questions) {
    const pid = q.patternId;
    const cid = q.chapterId || 'ACC_INV';
    if (pid) {
      if (!byPatternQ[pid]) byPatternQ[pid] = [];
      byPatternQ[pid].push(q.questionId);
    }
    if (!byChapter[cid]) byChapter[cid] = new Set();
    if (pid) byChapter[cid].add(pid);
  }

  const CHAPTER_NAMES = {
    ACC_INV: '재고자산',
  };

  const topics = Object.entries(byChapter).map(([chapterId, patternSet]) => {
    const pids = [...patternSet];
    const scores = pids.map((pid) => {
      const pattern = patterns.find((p) => p.patternId === pid) || { patternId: pid };
      return {
        patternId: pid,
        name: pattern.name || pid,
        score: computePatternMastery(pid, byPatternQ[pid] || []).score,
      };
    });
    const avg = scores.length
      ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
      : 0;
    return {
      chapterId,
      name: CHAPTER_NAMES[chapterId] || chapterId,
      score: avg,
      warn: avg < 60,
      patterns: scores.sort((a, b) => a.score - b.score),
    };
  });

  /* Pattern rows also act as map detail when only one chapter exists */
  const patternRows = (patterns.length ? patterns : Object.keys(byPatternQ).map((id) => ({ patternId: id })))
    .map((p) => {
      const score = computePatternMastery(p.patternId, byPatternQ[p.patternId] || []).score;
      return {
        patternId: p.patternId,
        name: p.name || p.patternId,
        score,
        warn: score < 60,
      };
    })
    .sort((a, b) => a.score - b.score);

  const progress = getProgressSummary();

  return {
    title: '나의 회계학 상태',
    topics,
    patternRows,
    overall: topics.length
      ? Math.round(topics.reduce((s, t) => s + t.score, 0) / topics.length)
      : Math.round((Number(progress.accuracy) || 0) * 100),
    generatedAt: new Date().toISOString(),
  };
}

export default {
  computePatternRiskScore,
  buildPatternRiskMap,
  prioritizeWeaknesses,
  buildMasteryMap,
  RISK_LABELS,
};
