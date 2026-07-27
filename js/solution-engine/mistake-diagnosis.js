/**
 * Sprint-15A+ — AI Mistake Diagnosis
 * Compare student answer vs correct answer → ranked causes + confidence.
 */

import { PATTERN_TUTOR_PROFILES } from '../ai-tutor-content/pattern-profiles.js';
import {
  normalizeCandidateWeights,
  scoreDiagnosisConfidence,
} from './confidence-engine.js';

/** Canonical diagnosis codes for Mistake Profile / Heatmap */
export const DIAGNOSIS_CODES = Object.freeze([
  { code: 'AVG_COST_ERROR', label: '평균단가 계산 오류' },
  { code: 'FIFO_ERROR', label: 'FIFO 적용 오류' },
  { code: 'CONDITION_MISS', label: '조건 누락' },
  { code: 'UNIT_ERROR', label: '단위 착오' },
  { code: 'CALC_ERROR', label: '계산 실수' },
  { code: 'CONCEPT_GAP', label: '개념 부족' },
  { code: 'METHOD_SWAP', label: '방법 혼동' },
  { code: 'NONE', label: '오답 없음 (정답)' },
]);

const CODE_MAP = Object.fromEntries(DIAGNOSIS_CODES.map((d) => [d.code, d.label]));

function baseCandidates(patternId) {
  const common = [
    { code: 'CONDITION_MISS', weight: 40 },
    { code: 'CALC_ERROR', weight: 35 },
    { code: 'UNIT_ERROR', weight: 25 },
    { code: 'CONCEPT_GAP', weight: 30 },
  ];

  if (patternId === 'ACC_INV_006') {
    return [
      { code: 'AVG_COST_ERROR', weight: 92 },
      { code: 'FIFO_ERROR', weight: 78 },
      { code: 'CONDITION_MISS', weight: 55 },
      { code: 'UNIT_ERROR', weight: 40 },
      { code: 'CALC_ERROR', weight: 48 },
    ];
  }
  if (patternId === 'ACC_INV_004') {
    return [
      { code: 'CALC_ERROR', weight: 70 },
      { code: 'METHOD_SWAP', weight: 65 },
      { code: 'CONDITION_MISS', weight: 50 },
      { code: 'UNIT_ERROR', weight: 45 },
      { code: 'CONCEPT_GAP', weight: 40 },
    ];
  }
  if (patternId === 'ACC_INV_001') {
    return [
      { code: 'CONDITION_MISS', weight: 80 },
      { code: 'METHOD_SWAP', weight: 60 },
      { code: 'CONCEPT_GAP', weight: 55 },
      { code: 'CALC_ERROR', weight: 35 },
      { code: 'UNIT_ERROR', weight: 20 },
    ];
  }
  if (patternId === 'ACC_INV_007') {
    return [
      { code: 'CALC_ERROR', weight: 72 },
      { code: 'CONDITION_MISS', weight: 58 },
      { code: 'CONCEPT_GAP', weight: 50 },
      { code: 'UNIT_ERROR', weight: 35 },
      { code: 'METHOD_SWAP', weight: 40 },
    ];
  }
  return common;
}

/**
 * @param {object} question
 * @param {{ result?: string, selected?: number, selectedAnswer?: number }} grade
 * @param {object|null} pattern
 */
export function diagnoseMistake(question = {}, grade = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const correct = Number(question.answer);
  const selected = Number(grade.selected ?? grade.selectedAnswer);
  const isCorrect =
    grade.result === 'correct'
    || (Number.isFinite(selected) && selected === correct);

  if (isCorrect) {
    return {
      isCorrect: true,
      primary: { code: 'NONE', label: CODE_MAP.NONE, confidence: 100, checked: true },
      candidates: [{ code: 'NONE', label: CODE_MAP.NONE, confidence: 100, checked: true }],
      confidence: { score: 100, percent: 100, level: 'HIGH' },
      summary: '정답입니다. 오답 진단이 필요하지 않습니다.',
      patternId,
    };
  }

  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  let candidates = baseCandidates(patternId);

  /* Boost by known wrongReasons keys if profile present */
  if (profile?.wrongReasons) {
    const keys = Object.keys(profile.wrongReasons);
    if (keys.some((k) => /fifo/i.test(k))) {
      candidates = bump(candidates, 'FIFO_ERROR', 8);
    }
    if (keys.some((k) => /calc|rate|formula/i.test(k))) {
      candidates = bump(candidates, 'CALC_ERROR', 8);
    }
    if (keys.some((k) => /method|fob|consignment/i.test(k))) {
      candidates = bump(candidates, 'CONDITION_MISS', 6);
    }
  }

  const answerDelta =
    Number.isFinite(selected) && Number.isFinite(correct)
      ? selected - correct
      : null;
  if (answerDelta === 1 || answerDelta === -1) {
    candidates = bump(candidates, 'CALC_ERROR', 10);
  }

  const ranked = normalizeCandidateWeights(candidates)
    .sort((a, b) => b.confidence - a.confidence)
    .map((c, i) => ({
      code: c.code,
      label: CODE_MAP[c.code] || c.code,
      confidence: c.confidence,
      checked: i === 0,
      weight: c.weight,
    }));

  const primary = ranked[0];
  const confidence = scoreDiagnosisConfidence({
    isCorrect: false,
    matchedHint: Boolean(profile?.wrongReasons),
    patternKnown: Boolean(patternId),
    answerDelta,
    hasCalculation: ['ACC_INV_004', 'ACC_INV_006', 'ACC_INV_007'].includes(patternId),
    primaryWeight: primary?.confidence,
  });

  /* Align primary displayed confidence with engine score when top is strong */
  if (primary) {
    primary.confidence = Math.max(primary.confidence, confidence.percent);
    if (primary.confidence > 99) primary.confidence = 99;
  }

  return {
    isCorrect: false,
    primary,
    candidates: ranked,
    confidence,
    summary: primary
      ? `가장 가능성 높은 오답 원인: ${primary.label} (Confidence ${primary.confidence}%)`
      : '오답 원인을 특정하지 못했습니다.',
    patternId,
    selected,
    correct,
  };
}

function bump(list, code, delta) {
  return list.map((c) =>
    c.code === code ? { ...c, weight: (Number(c.weight) || 0) + delta } : c,
  );
}

export default {
  DIAGNOSIS_CODES,
  diagnoseMistake,
};
