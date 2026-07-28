/**
 * Sprint-17D — Choice analysis helpers
 */

export const CHOICE_ANALYZER_VERSION = '17D';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/**
 * @param {number} index0
 */
export function choiceLabel(index0) {
  return CIRCLED[index0] || `${index0 + 1}`;
}

/**
 * Prompt fragment forcing full choice analysis.
 * @param {{ choices?: string[], correctAnswer?: number }} input
 */
export function buildChoiceAnalysisGuidance(input = {}) {
  const choices = Array.isArray(input.choices) ? input.choices : [];
  const correct = Number(input.correctAnswer);
  const lines = choices.map((c, i) => {
    const mark = Number.isFinite(correct) && correct === i + 1 ? ' ← 정답' : '';
    return `${choiceLabel(i)} ${String(c ?? '')}${mark}`;
  });

  return [
    '[선택지 분석 — 필수]',
    'choiceAnalysis 배열에 모든 보기를 넣어라.',
    '각 항목: { "choice":"①", "correct":true|false, "reason":"..." }',
    '정답 보기: 왜 맞는지 (이론 + 문제 조건)',
    '오답 보기: 왜 틀리는지 (함정·혼동 개념)',
    '보기 분석 없는 해설은 금지.',
    '',
    ...lines,
  ].join('\n');
}

/**
 * Normalize choiceAnalysis and derive whyAnswer / whyOthersWrong.
 * @param {object} payload
 * @param {{ choices?: string[], correctAnswer?: number }} context
 */
export function normalizeChoiceAnalysis(payload = {}, context = {}) {
  const choices = Array.isArray(context.choices) ? context.choices : [];
  const correct = Number(context.correctAnswer);
  let list = Array.isArray(payload.choiceAnalysis) ? payload.choiceAnalysis.slice() : [];

  if (!list.length && Array.isArray(payload.whyOthersWrong)) {
    list = choices.map((_, i) => {
      const isCorrect = Number.isFinite(correct) && correct === i + 1;
      return {
        choice: choiceLabel(i),
        correct: isCorrect,
        reason: isCorrect
          ? (Array.isArray(payload.whyAnswer) ? payload.whyAnswer.join(' ') : String(payload.whyAnswer || ''))
          : String(payload.whyOthersWrong[i] || payload.whyOthersWrong[0] || ''),
      };
    });
  }

  list = list.map((row, i) => {
    const isCorrect =
      typeof row?.correct === 'boolean'
        ? row.correct
        : Number.isFinite(correct) && correct === i + 1;
    return {
      choice: String(row?.choice || choiceLabel(i)),
      correct: isCorrect,
      reason: String(row?.reason || '').trim(),
    };
  });

  /* ensure length matches choices when possible */
  if (choices.length && list.length < choices.length) {
    for (let i = list.length; i < choices.length; i += 1) {
      list.push({
        choice: choiceLabel(i),
        correct: Number.isFinite(correct) && correct === i + 1,
        reason: '',
      });
    }
  }

  const whyAnswer = list.filter((r) => r.correct).map((r) => r.reason).filter(Boolean);
  const whyOthersWrong = list
    .filter((r) => !r.correct)
    .map((r) => `${r.choice} ${r.reason}`.trim())
    .filter((s) => s.length > 1);

  return { choiceAnalysis: list, whyAnswer, whyOthersWrong };
}

/**
 * All choices have non-empty reasons?
 */
export function hasCompleteChoiceAnalysis(choiceAnalysis, expectedCount = 0) {
  const list = Array.isArray(choiceAnalysis) ? choiceAnalysis : [];
  if (!list.length) return false;
  if (expectedCount > 0 && list.length < expectedCount) return false;
  return list.every((r) => String(r?.reason || '').trim().length >= 8);
}

export default {
  choiceLabel,
  buildChoiceAnalysisGuidance,
  normalizeChoiceAnalysis,
  hasCompleteChoiceAnalysis,
  CHOICE_ANALYZER_VERSION,
};
