/**
 * Sprint-15B — Smart Review (Smart Explanation + 30초 복습)
 * Official Pattern profile / formula data only — no guessing.
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';
import { persistSmartReview } from './cache.js';

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

function labelOf(n) {
  const i = Number(n) - 1;
  return CHOICE_LABELS[i] || String(n);
}

function firstLine(text) {
  if (!text) return '';
  return String(text).split(/\n+/)[0].trim().slice(0, 120);
}

/**
 * Reviewer Approved Note → Tutor warning lines (official override only).
 * @param {string|null} reviewerNote
 * @param {object|null} approvedSolution
 */
export function buildReviewerFeedbackHints(reviewerNote, approvedSolution = null) {
  const hints = [];
  const note = String(reviewerNote || '').trim();
  if (note) {
    hints.push({
      source: 'reviewerNote',
      title: '주의',
      message: note.length > 160 ? `${note.slice(0, 157)}…` : note,
    });
  }
  const trap = approvedSolution?.examTrap || approvedSolution?.solution?.examTrap;
  if (trap) {
    hints.push({
      source: 'approvedExamTrap',
      title: '주의',
      message: firstLine(trap),
    });
  }
  return hints;
}

/**
 * Smart Explanation — 시험장 암기 우선 5단 구조.
 * Uses solution pack + official Pattern profile only.
 */
export function buildSmartExplanation(question = {}, pattern = null, grade = null, pack = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId || '재고자산';
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;
  const correct = Number(question.answer);
  const selected = grade?.selected ?? grade?.selectedAnswer ?? null;

  const oneLineAnswer = `정답 ${labelOf(correct)} (${correct})${
    selected == null
      ? ''
      : Number(selected) === correct
        ? ' · 선택과 일치'
        : ` · 학생 선택 ${labelOf(selected)}`
  }`;

  const coreReason =
    firstLine(profile?.examinerIntent)
    || firstLine(profile?.explanation)
    || `「${patternName}」 Pattern의 핵심 판단을 적용합니다.`;

  const calcOrder = [];
  if (Array.isArray(template?.steps) && template.steps.length) {
    template.steps.slice(0, 5).forEach((s) => calcOrder.push(String(s)));
  } else if (Array.isArray(profile?.solvingAlgorithm)) {
    profile.solvingAlgorithm.slice(0, 5).forEach((s) => calcOrder.push(String(s)));
  } else if (Array.isArray(pack?.explanation?.steps)) {
    pack.explanation.steps.slice(0, 5).forEach((s) => {
      if (s?.body) calcOrder.push(String(s.body));
    });
  }
  if (!calcOrder.length) {
    calcOrder.push('조건 확인 → Pattern 적용 → 보기 검증');
  }

  const traps = [];
  if (profile?.similarTrap) traps.push(firstLine(profile.similarTrap));
  if (template?.commonError) traps.push(firstLine(template.commonError));
  if (profile?.frequentlyConfusedWith) {
    traps.push(`혼동 주의: ${firstLine(profile.frequentlyConfusedWith)}`);
  }
  if (!traps.length) traps.push('조건·방법을 끝까지 확인하지 않으면 함정에 빠집니다.');

  const memorySentence =
    firstLine(profile?.memoryTip)
    || firstLine(template?.memoryHook)
    || (Array.isArray(pack?.keyTakeaway) && pack.keyTakeaway[0])
    || `「${patternName}」 구조를 한 문장으로 외우세요.`;

  return {
    title: 'AI 풀이',
    sections: [
      { id: 'oneLine', order: 1, title: '① 한 줄 정답', body: oneLineAnswer },
      { id: 'coreReason', order: 2, title: '② 핵심 이유', body: coreReason },
      {
        id: 'calcOrder',
        order: 3,
        title: '③ 계산 순서',
        body: calcOrder.map((l, i) => `${i + 1}. ${l}`).join('\n'),
        lines: calcOrder,
      },
      {
        id: 'traps',
        order: 4,
        title: '④ 주의할 함정',
        body: traps.join('\n'),
        lines: traps,
      },
      {
        id: 'memory',
        order: 5,
        title: '⑤ 시험장에서 기억할 문장',
        body: memorySentence,
      },
    ],
    patternId,
    patternName,
    source: 'smart-tutor/official-profile',
  };
}

/**
 * 30초 복습 카드 — Pattern 암기 포인트.
 */
export function buildThirtySecondReview(question = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId || '재고자산';
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;

  let bullets = [];

  if (patternId === 'ACC_INV_006') {
    bullets = [
      '먼저 평균단가 계산 금지 (FIFO 문제면)',
      'FIFO는 먼저 들어온 재고부터 판매',
      '기말재고는 최근 매입분',
    ];
  } else if (patternId === 'ACC_INV_001') {
    bullets = [
      '소유권 기준으로 포함/제외',
      'FOB 선적·도착을 반대로 적용하지 않기',
      '위탁·적송은 미판매분만 내 재고',
    ];
  } else if (patternId === 'ACC_INV_004') {
    bullets = [
      '기초 + 매입 − 기말 = 매출원가',
      '이익률이 매출 기준인지 확인',
      '기말 ↑ → 매출원가 ↓ → 이익 ↑',
    ];
  } else if (Array.isArray(profile?.examThinking) && profile.examThinking.length) {
    bullets = profile.examThinking.slice(0, 3).map((t) =>
      String(t).replace(/^시험장\s*\d*초?:\s*/i, '').slice(0, 48),
    );
  } else if (template?.memoryHook) {
    bullets = [firstLine(template.memoryHook)];
    if (template.commonError) bullets.push(`함정: ${firstLine(template.commonError)}`);
    if (profile?.solvingAlgorithm?.[0]) bullets.push(String(profile.solvingAlgorithm[0]).slice(0, 48));
  }

  if (!bullets.length) {
    bullets = [
      `${patternName} 핵심 조건 확인`,
      '공식·방법을 먼저 확정',
      '보기 검증 후 선택',
    ];
  }

  const card = {
    title: '30초 복습',
    headline: patternName.includes('FIFO') || patternId === 'ACC_INV_006' ? 'FIFO' : patternName,
    bullets: bullets.slice(0, 4).map((text) => ({ mark: '✔', text })),
    seconds: 30,
    label: '암기시간',
    patternId,
    patternName,
  };

  if (question.questionId) {
    persistSmartReview(question.questionId, {
      thirtySecond: card,
      patternId,
    });
  }

  return card;
}

/**
 * Bundle Smart Review layer from solution pack + official data.
 */
export function buildSmartReviewBundle(input = {}) {
  const {
    question = {},
    pattern = null,
    grade = null,
    pack = null,
    reviewerNote = null,
    approvedSolution = null,
  } = input;

  const explanation = buildSmartExplanation(question, pattern, grade, pack);
  const thirtySecond = buildThirtySecondReview(question, pattern);
  const reviewerHints = buildReviewerFeedbackHints(reviewerNote, approvedSolution);

  if (reviewerHints.length) {
    const warn = reviewerHints[0];
    explanation.sections.push({
      id: 'reviewerHint',
      order: 6,
      title: `⚠ ${warn.title}`,
      body: warn.message,
      fromReviewer: true,
    });
  }

  const bundle = {
    explanation,
    thirtySecond,
    reviewerHints,
    generatedAt: new Date().toISOString(),
  };

  if (question.questionId) {
    persistSmartReview(question.questionId, bundle);
  }

  return bundle;
}

export default {
  buildSmartExplanation,
  buildThirtySecondReview,
  buildReviewerFeedbackHints,
  buildSmartReviewBundle,
};
