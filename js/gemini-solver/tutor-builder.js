/**
 * Sprint-17A — Tutor Advice Builder
 */

/**
 * @param {object} geminiPayload
 */
export function buildTutorFromGemini(geminiPayload = {}) {
  const advice = String(geminiPayload.tutorAdvice || '').trim();
  const checklist = Array.isArray(geminiPayload.examChecklist)
    ? geminiPayload.examChecklist.map((s) => String(s ?? ''))
    : [];

  return {
    advice: advice || '문제를 직접 읽고 계산한 뒤 보기와 대조하세요.',
    checklist,
    tone: 'tutor',
    source: 'gemini-native',
  };
}

export default { buildTutorFromGemini };
