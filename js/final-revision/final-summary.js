/**
 * Sprint-18A — Condensed AI Final Summary
 * Sends ONLY summary data to Gemini-style generator (never full textbook).
 * Local deterministic generation — no prediction / no exam forecasting.
 */

import { listTextbookEntries, getWeakCollection } from '../personal-textbook/textbook-engine.js';
import { loadSummaryDoc } from '../personal-textbook/textbook-storage.js';
import { loadExamGoalDoc } from '../exam-goal/exam-goal-storage.js';
import { rankFormulas, rankWeakPatterns } from './final-book-rank.js';
import { loadFinalSummaryDoc, saveFinalSummaryDoc } from './final-book-storage.js';

export const FINAL_SUMMARY_VERSION = '18A';

/**
 * Build condensed payload for AI Final Summary (never full textbook).
 */
export function buildCondensedFinalPayload(entries = null) {
  const list = Array.isArray(entries) ? entries : listTextbookEntries();
  const weak = getWeakCollection();
  const formulas = rankFormulas(list).slice(0, 30);
  const patterns = rankWeakPatterns(list).slice(0, 20);
  const twoWeeksAgo = Date.now() - 14 * 86400000;
  const recentMistakes = list
    .filter((e) => !e.correct && Date.parse(e.at || e.date || '') >= twoWeeksAgo)
    .slice(-40)
    .map((e) => ({
      questionId: e.questionId,
      patternId: e.patternId,
      mistake: e.mistakeDiagnosis,
      tip: (e.examTip || [])[0] || null,
      /* Sprint-17D — extract from Professor Explanation when present */
      coreConcept:
        e.coreConcept
        || e.professorExplanation?.coreConcept
        || null,
      memoryHack: (e.memoryHack || e.professorExplanation?.memoryHack || [])[0] || null,
      examTip:
        (e.examTip || [])[0]
        || (Array.isArray(e.professorExplanation?.examTip)
          ? e.professorExplanation.examTip[0]
          : e.professorExplanation?.examTip)
        || null,
    }));

  const professorCompress = list
    .filter((e) => e.professorExplanation || e.coreConcept)
    .slice(-50)
    .map((e) => ({
      questionId: e.questionId,
      coreConcept: e.coreConcept || e.professorExplanation?.coreConcept || null,
      mistakePoint:
        e.mistakeDiagnosis
        || (e.whyOthersWrong || [])[0]
        || null,
      memoryHack: (e.memoryHack || [])[0] || e.professorExplanation?.memoryHack || null,
      examTip: (e.examTip || [])[0] || null,
    }));

  const goal = loadExamGoalDoc();
  const summaries = loadSummaryDoc();

  const masteryLow = patterns.filter((p) => p.mastery < 60);

  return {
    weakPattern: (weak.weakPatterns || []).slice(0, 10),
    weakFormula: (weak.weakFormulas || formulas.filter((f) => f.wrong > 0)).slice(0, 15),
    recentMistake: recentMistakes,
    professorCompress,
    mastery: masteryLow.map((p) => ({
      patternId: p.patternId,
      patternName: p.patternName,
      mastery: p.mastery,
    })),
    goal: {
      examDate: goal?.examDate || null,
      targetScore: goal?.targetScore || null,
      currentScore: goal?.currentScore || null,
    },
    examDate: goal?.examDate || null,
    reviewCycle: {
      dueFocus: masteryLow.slice(0, 5).map((p) => p.patternId),
    },
    patternSummaryCount: Object.keys(summaries.byPatternId || {}).length,
    formulaTop: formulas.slice(0, 10).map((f) => f.formula),
  };
}

/**
 * Generate final summary from condensed data only.
 * Prioritizes student's riskiest areas — no exam prediction.
 */
export function generateAiFinalSummary(condensed = null) {
  const data = condensed || buildCondensedFinalPayload();
  const lines = [
    '【AI Final Summary】 학생 위험 구간 우선 정리 (출제 예측 아님)',
    '',
    '① 위험 Pattern',
    ...(data.weakPattern || []).slice(0, 8).map(
      (p, i) => `  ${i + 1}. ${p.patternName || p.patternId} (오답 ${p.wrong || 0})`,
    ),
    '',
    '② 위험 공식',
    ...(data.weakFormula || []).slice(0, 8).map(
      (f, i) => `  ${i + 1}. ${f.formula || f} (오답 ${f.wrong || 0})`,
    ),
    '',
    '③ Mastery 60 미만',
    ...(data.mastery || []).slice(0, 8).map(
      (m, i) => `  ${i + 1}. ${m.patternName || m.patternId} · Mastery ${m.mastery}`,
    ),
    '',
    '④ 최근 실수',
    ...(data.recentMistake || []).slice(0, 8).map(
      (m, i) => `  ${i + 1}. ${m.questionId}: ${m.mistake || '오답'}`,
    ),
    '',
    `시험일: ${data.examDate || '미설정'}`,
    `목표: ${data.goal?.targetScore ?? '—'} / 현재: ${data.goal?.currentScore ?? '—'}`,
    '',
    '핵심 포인트: 위 위험 구간을 시험 직전 반복 복습하세요. 출제 예측은 하지 않습니다.',
  ];

  const text = lines.join('\n');
  const doc = loadFinalSummaryDoc();
  if (doc.aiFinalSummary) {
    if (!Array.isArray(doc.history)) doc.history = [];
    doc.history.push({
      body: doc.aiFinalSummary,
      at: doc.updatedAt || new Date().toISOString(),
    });
    if (doc.history.length > 20) doc.history = doc.history.slice(-20);
  }
  doc.condensed = data;
  doc.aiFinalSummary = text;
  doc.version = FINAL_SUMMARY_VERSION;
  saveFinalSummaryDoc(doc);

  return {
    text,
    condensed: data,
    predictionForbidden: true,
    version: FINAL_SUMMARY_VERSION,
  };
}

export default {
  FINAL_SUMMARY_VERSION,
  buildCondensedFinalPayload,
  generateAiFinalSummary,
};
