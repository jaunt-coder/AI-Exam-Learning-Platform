/**
 * Sprint-17D — Problem Analyzer
 * Extracts what the examiner asks from Resolved Question text (not Pattern name).
 */

export const PROBLEM_ANALYZER_VERSION = '17D';

function cleanText(v) {
  return String(v || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{ questionText?: string, tableHtml?: string, choices?: string[], subjectId?: string }} input
 */
export function analyzeProblem(input = {}) {
  const questionText = cleanText(input.questionText);
  const tableText = cleanText(input.tableHtml);
  const choices = Array.isArray(input.choices) ? input.choices.map(cleanText) : [];
  const subjectId = String(input.subjectId || 'accounting');

  const askMatch = questionText.match(/([^?.!]{8,120}[?？])\s*$/);
  const askFocus = askMatch ? askMatch[1].trim() : questionText.slice(-120);

  const hasNumbers = /\d/.test(questionText + tableText);
  const hasTable = Boolean(tableText);
  const choiceCount = choices.length;

  const problemType = detectProblemType(questionText, subjectId, hasNumbers);

  return {
    schemaVersion: PROBLEM_ANALYZER_VERSION,
    subjectId,
    questionText,
    tableText,
    choices,
    choiceCount,
    askFocus,
    hasNumbers,
    hasTable,
    problemType,
    examinerIntentHint: buildIntentHint(askFocus, problemType, subjectId),
  };
}

function detectProblemType(text, subjectId, hasNumbers) {
  const t = text.toLowerCase();
  if (subjectId === 'civil' || subjectId === 'law') {
    if (/옳지\s*않|틀린|잘못된/.test(text)) return 'theory-incorrect';
    return 'theory-correct';
  }
  if (subjectId === 'realestate') {
    return /용어|특성|개념/.test(text) ? 'concept' : 'theory';
  }
  if (subjectId === 'economics') {
    return hasNumbers || /균형|탄력성|수요|공급/.test(text) ? 'calc-or-graph' : 'theory';
  }
  if (/옳지\s*않|틀린/.test(text)) return 'theory-incorrect';
  if (hasNumbers || /얼마|금액|원가|손익|재고/.test(text)) return 'calculation';
  return 'theory';
}

function buildIntentHint(askFocus, problemType, subjectId) {
  const focus = askFocus || '출제 취지를 문제 문장에서 읽는다';
  return `이 문제는 (${subjectId}) ${problemType} 유형으로, 출제자가 「${focus}」를 묻고 있다.`;
}

export default { analyzeProblem, PROBLEM_ANALYZER_VERSION };
