/**
 * Sprint-17A/17C — Exam Tip Builder
 */

/**
 * @param {object} geminiPayload
 */
export function buildExamTipsFromGemini(geminiPayload = {}) {
  const checklist = Array.isArray(geminiPayload.examTip) && geminiPayload.examTip.length
    ? geminiPayload.examTip.map((s) => String(s ?? '').trim()).filter(Boolean)
    : Array.isArray(geminiPayload.examChecklist)
      ? geminiPayload.examChecklist.map((s) => String(s ?? '').trim()).filter(Boolean)
      : [];

  const steps = (checklist.length ? checklist : ['조건 표시', '계산', '보기 대조']).map(
    (label, i) => ({
      order: i + 1,
      label,
    }),
  );

  return {
    headline: '시험장에서',
    subHeadline: '이렇게 푸세요',
    steps,
    warnings: [],
    checklist,
    examTip: checklist,
    source: 'gemini-native',
  };
}

export default { buildExamTipsFromGemini };
