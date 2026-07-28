/**
 * Sprint-18A — Formula / Weak Pattern ranking for Final Revision Book
 * Ranking only — does not change Mastery / Recommendation engines.
 */

import { loadMasteryState } from '../mastery-service.js';
import { listTextbookEntries } from '../personal-textbook/textbook-engine.js';
import { loadExamGoalDoc } from '../exam-goal/exam-goal-storage.js';

function daysSince(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, (Date.now() - t) / 86400000);
}

function masteryMap() {
  const map = new Map();
  try {
    const state = loadMasteryState();
    for (const p of state?.patterns || []) {
      const id = p.patternId || p.pattern_id;
      if (!id) continue;
      const score =
        typeof p.score === 'number'
          ? p.score
          : typeof p.mastery === 'number'
            ? p.mastery
            : typeof p.accuracy === 'number'
              ? Math.round(p.accuracy * 100)
              : 50;
      map.set(id, {
        mastery: score,
        confidence: typeof p.confidence === 'number' ? p.confidence : score / 100,
        lastReviewAt: p.lastReviewAt || p.updatedAt || null,
      });
    }
  } catch (_e) {
    /* empty */
  }
  return map;
}

/**
 * Formula Ranking = 사용 빈도 × 오답률 × 최근 학습
 */
export function rankFormulas(entries = null) {
  const list = Array.isArray(entries) ? entries : listTextbookEntries();
  const map = new Map();

  for (const e of list) {
    const formulas = Array.isArray(e.formula) ? e.formula : [];
    for (const f of formulas) {
      const text = String(f || '').trim();
      if (!text) continue;
      const cur = map.get(text) || {
        formula: text,
        uses: 0,
        wrong: 0,
        lastAt: null,
        patternIds: new Set(),
      };
      cur.uses += 1;
      if (!e.correct) cur.wrong += 1;
      if (!cur.lastAt || String(e.at || '') > String(cur.lastAt)) cur.lastAt = e.at;
      if (e.patternId) cur.patternIds.add(e.patternId);
      map.set(text, cur);
    }
  }

  const ranked = [...map.values()].map((row) => {
    const wrongRate = row.uses ? row.wrong / row.uses : 0;
    const recentBoost = Math.max(0.2, 1 - daysSince(row.lastAt) / 60);
    const score = row.uses * (0.35 + wrongRate) * recentBoost;
    return {
      formula: row.formula,
      uses: row.uses,
      wrong: row.wrong,
      wrongRate: Math.round(wrongRate * 1000) / 1000,
      lastAt: row.lastAt,
      patternIds: [...row.patternIds],
      score: Math.round(score * 1000) / 1000,
    };
  });

  ranked.sort((a, b) => b.score - a.score || b.wrong - a.wrong || b.uses - a.uses);
  return ranked;
}

/**
 * Weak Pattern Ranking — 오답횟수 · Mastery · Confidence · Review Delay
 */
export function rankWeakPatterns(entries = null) {
  const list = Array.isArray(entries) ? entries : listTextbookEntries();
  const mMap = masteryMap();
  const map = new Map();

  for (const e of list) {
    if (!e.patternId) continue;
    const cur = map.get(e.patternId) || {
      patternId: e.patternId,
      patternName: e.patternName || e.patternId,
      attempts: 0,
      wrong: 0,
      lastAt: null,
    };
    cur.attempts += 1;
    if (!e.correct) cur.wrong += 1;
    if (!cur.lastAt || String(e.at || '') > String(cur.lastAt)) cur.lastAt = e.at;
    map.set(e.patternId, cur);
  }

  const ranked = [...map.values()].map((row) => {
    const m = mMap.get(row.patternId) || {};
    const mastery = typeof m.mastery === 'number' ? m.mastery : 50;
    const confidence = typeof m.confidence === 'number' ? m.confidence : mastery / 100;
    const reviewDelay = daysSince(m.lastReviewAt || row.lastAt);
    const wrongRate = row.attempts ? row.wrong / row.attempts : 0;
    const risk =
      row.wrong * 3
      + (100 - mastery) * 0.4
      + (1 - confidence) * 40
      + Math.min(reviewDelay, 30) * 0.8
      + wrongRate * 25;

    return {
      patternId: row.patternId,
      patternName: row.patternName,
      wrong: row.wrong,
      attempts: row.attempts,
      mastery,
      confidence: Math.round(confidence * 1000) / 1000,
      reviewDelay: Math.round(reviewDelay * 10) / 10,
      risk: Math.round(risk * 10) / 10,
      lastAt: row.lastAt,
    };
  });

  ranked.sort((a, b) => b.risk - a.risk || b.wrong - a.wrong);
  return ranked;
}

export function getExamDaysRemaining() {
  try {
    const goal = loadExamGoalDoc();
    if (!goal?.examDate) return null;
    const target = Date.parse(goal.examDate);
    if (!Number.isFinite(target)) return null;
    return Math.ceil((target - Date.now()) / 86400000);
  } catch (_e) {
    return null;
  }
}

export const AUTO_TRIGGER_DAYS = Object.freeze([30, 14, 7, 3, 1]);

export function shouldAutoGenerateFinalBook(lastTrigger = null, daysRemaining = null) {
  const d = daysRemaining ?? getExamDaysRemaining();
  if (d == null || d < 0) return { should: false, day: null };
  const hit = AUTO_TRIGGER_DAYS.find((x) => d === x);
  if (!hit) return { should: false, day: null };
  if (lastTrigger?.day === hit && lastTrigger?.date === new Date().toISOString().slice(0, 10)) {
    return { should: false, day: hit, already: true };
  }
  return { should: true, day: hit };
}

export default {
  rankFormulas,
  rankWeakPatterns,
  getExamDaysRemaining,
  AUTO_TRIGGER_DAYS,
  shouldAutoGenerateFinalBook,
};
