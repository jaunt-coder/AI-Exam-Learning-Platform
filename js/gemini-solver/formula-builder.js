/**
 * Sprint-17A — Formula Card Builder
 * Shape compatible with smart-tutor renderFormulaCardHtml.
 */

/**
 * @param {object} geminiPayload
 */
export function buildFormulaCardFromGemini(geminiPayload = {}) {
  const raw = String(geminiPayload.formulaCard || '').trim();
  const lines = raw
    ? raw
        .split(/[\n→>]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : ['조건 확인', '관계식', '계산', '보기 대조'];

  const formula = raw || lines.join(' → ');

  return {
    title: '공식 카드',
    purpose: '암기',
    headline: lines[0] || '공식',
    chain: lines.map((label, i) => ({ order: i + 1, label })),
    formulas: [
      {
        name: '핵심 공식',
        formula,
      },
    ],
    formula,
    lines,
    items: lines.map((line, i) => ({ order: i + 1, text: line })),
    source: 'gemini-native',
  };
}

/**
 * Also map into solution-engine formulas array shape.
 */
export function buildFormulasFromGemini(geminiPayload = {}) {
  const card = buildFormulaCardFromGemini(geminiPayload);
  return (card.formulas || []).map((f) => ({
    name: f.name,
    formula: f.formula,
    expression: f.formula,
    when: '이 문제 직접 계산',
    source: 'gemini-native',
  }));
}

export default {
  buildFormulaCardFromGemini,
  buildFormulasFromGemini,
};
