/**
 * Sprint-17C — Explanation Builder (Human-Level → Result UI)
 */

/**
 * @param {object} geminiPayload
 */
export function buildExplanationFromGemini(geminiPayload = {}) {
  const thinking = geminiPayload.thinkingOrder || geminiPayload.stepByStep || [];
  const steps = thinking.map((body, i) => ({
    order: i + 1,
    title: `접근 ${i + 1}`,
    body: String(body ?? ''),
  }));

  const markdown = [
    geminiPayload.summary ? `## 요약\n${geminiPayload.summary}` : '',
    steps.length
      ? `## 문제 접근 순서\n${steps.map((s) => `${s.order}. ${s.body}`).join('\n')}`
      : '',
    (geminiPayload.whyAnswer || []).length
      ? `## 정답이 되는 이유\n${geminiPayload.whyAnswer.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    steps,
    markdown,
    summary: String(geminiPayload.summary || ''),
    thinkingOrder: thinking,
    whyAnswer: geminiPayload.whyAnswer || [],
    whyOthersWrong: geminiPayload.whyOthersWrong || [],
    source: 'gemini-native',
    engine: 'gemini-solver/17C',
    confidence: Number(geminiPayload.confidence) || 0,
  };
}

/**
 * Smart Tutor / Accordion sections — Human-Level 7 blocks.
 */
export function buildSmartSectionsFromGemini(geminiPayload = {}) {
  const sections = [];
  if (geminiPayload.summary) {
    sections.push({ title: '요약', body: String(geminiPayload.summary), lines: [] });
  }
  const thinking = geminiPayload.thinkingOrder || geminiPayload.stepByStep || [];
  if (thinking.length) {
    sections.push({
      title: '문제 접근 순서',
      body: '',
      lines: thinking.map((s, i) => `${i + 1}. ${s}`),
    });
  }
  if ((geminiPayload.whyAnswer || []).length) {
    sections.push({
      title: '정답이 되는 이유',
      body: '',
      lines: geminiPayload.whyAnswer.map((s, i) => `${i + 1}. ${s}`),
    });
  }
  return {
    sections,
    source: 'gemini-native',
    humanLevel: true,
    oneLineAnswer: geminiPayload.summary || '',
    thinkingOrder: thinking,
    whyAnswer: geminiPayload.whyAnswer || [],
    whyOthersWrong: geminiPayload.whyOthersWrong || [],
    memoryHack: geminiPayload.memoryHack || [],
    examTip: geminiPayload.examTip || [],
    formula: geminiPayload.formula || [],
  };
}

/**
 * Render helpers for Accordion bodies.
 */
export function renderListHtml(items, esc) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '<p class="ll-hint">—</p>';
  return `<ol class="st-human-list">${list
    .map((s) => `<li>${esc(s)}</li>`)
    .join('')}</ol>`;
}

export function renderBulletHtml(items, esc) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '<p class="ll-hint">—</p>';
  return `<ul class="st-human-list">${list
    .map((s) => `<li>${esc(s)}</li>`)
    .join('')}</ul>`;
}

export default {
  buildExplanationFromGemini,
  buildSmartSectionsFromGemini,
  renderListHtml,
  renderBulletHtml,
};
