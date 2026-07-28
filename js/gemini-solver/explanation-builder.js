/**
 * Sprint-17A — Explanation Builder (Gemini → Result UI pack.explanation)
 */

/**
 * @param {object} geminiPayload
 * @returns {object} solution-engine compatible explanation
 */
export function buildExplanationFromGemini(geminiPayload = {}) {
  const steps = (geminiPayload.stepByStep || []).map((body, i) => ({
    order: i + 1,
    title: `Step${i + 1}`,
    body: String(body ?? ''),
  }));

  const markdown = [
    geminiPayload.summary ? `## 요약\n${geminiPayload.summary}` : '',
    steps.length
      ? `## 단계별 풀이\n${steps.map((s) => `${s.order}. ${s.body}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    steps,
    markdown,
    summary: String(geminiPayload.summary || ''),
    source: 'gemini-native',
    engine: 'gemini-solver/17A',
    confidence: Number(geminiPayload.confidence) || 0,
  };
}

/**
 * Smart Tutor explanation sections from Gemini.
 */
export function buildSmartSectionsFromGemini(geminiPayload = {}) {
  const sections = [];
  if (geminiPayload.summary) {
    sections.push({ title: '한 줄 요약', body: String(geminiPayload.summary), lines: [] });
  }
  if (Array.isArray(geminiPayload.stepByStep) && geminiPayload.stepByStep.length) {
    sections.push({
      title: '단계별 풀이',
      body: '',
      lines: geminiPayload.stepByStep.map((s, i) => `${i + 1}. ${s}`),
    });
  }
  return {
    sections,
    source: 'gemini-native',
    oneLineAnswer: geminiPayload.summary || '',
  };
}

export default {
  buildExplanationFromGemini,
  buildSmartSectionsFromGemini,
};
