/**
 * Sprint-17A/17C — Formula Card Builder (이 문제에서 사용한 공식만)
 */

/**
 * @param {object} geminiPayload
 */
export function buildFormulaCardFromGemini(geminiPayload = {}) {
  const fromList = Array.isArray(geminiPayload.formula)
    ? geminiPayload.formula.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];
  const raw = fromList.length
    ? fromList.join(' → ')
    : String(geminiPayload.formulaCard || '').trim();
  const lines = fromList.length
    ? fromList
    : raw
      ? raw
          .split(/[\n→>]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : ['조건 확인', '관계식', '계산', '보기 대조'];

  const formula = raw || lines.join(' → ');

  return {
    title: '공식',
    purpose: '이 문제',
    headline: lines[0] || '공식',
    chain: lines.map((label, i) => ({ order: i + 1, label })),
    formulas: lines.map((f, i) => ({
      name: `공식 ${i + 1}`,
      formula: f,
    })),
    formula,
    lines,
    items: lines.map((line, i) => ({ order: i + 1, text: line })),
    source: 'gemini-native',
  };
}

/**
 * @param {object} geminiPayload
 */
export function buildFormulasFromGemini(geminiPayload = {}) {
  const card = buildFormulaCardFromGemini(geminiPayload);
  return (card.formulas || []).map((f) => ({
    name: f.name,
    formula: f.formula,
    expression: f.formula,
    when: '이 문제에서 사용한 공식',
    source: 'gemini-native',
  }));
}

export default {
  buildFormulaCardFromGemini,
  buildFormulasFromGemini,
};
