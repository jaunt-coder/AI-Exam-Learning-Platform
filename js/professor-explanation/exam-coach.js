/**
 * Sprint-17D — Exam coach (trap / memory / tip fragments for prompt + payload)
 */

export const EXAM_COACH_VERSION = '17D';

/**
 * Prompt fragment for exam tips.
 */
export function buildExamCoachGuidance(input = {}) {
  const subjectId = String(input.subjectId || 'accounting');
  return [
    '[시험장 Tip — 필수]',
    'examTip: 출제자가 좋아하는 함정 + 빠른 판단 기준 (2~4문장 또는 배열)',
    'memoryHack: 30초 안에 외울 문장 (학생 재사용 가능)',
    'tutorMessage: AI 강사가 학생에게 직접 하는 한마디 (격려 + 다음 행동)',
    `과목(${subjectId}) 용어를 사용하고 일반론만 나열하지 말 것.`,
  ].join('\n');
}

/**
 * Normalize tip fields to strings/arrays for UI.
 * @param {object} payload
 */
export function normalizeExamCoachFields(payload = {}) {
  const asList = (v) => {
    if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim()).filter(Boolean);
    if (typeof v === 'string' && v.trim()) return [v.trim()];
    return [];
  };

  const formula = asList(payload.formula);
  const memoryHack = asList(payload.memoryHack);
  const examTip = asList(payload.examTip);
  const tutorMessage = String(
    payload.tutorMessage
    || payload.tutorAdvice
    || '',
  ).trim();

  return {
    formula,
    memoryHack,
    examTip,
    tutorMessage,
  };
}

export default {
  buildExamCoachGuidance,
  normalizeExamCoachFields,
  EXAM_COACH_VERSION,
};
