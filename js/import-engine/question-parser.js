/**
 * Sprint-19B — Question Parser (Universal)
 * Splits numbered MCQ bodies + choices from subject text.
 */

export const QUESTION_PARSER_VERSION = '19B';

const CHOICE_RE = /[①②③④⑤]/g;
const CHOICE_SPLIT = /(?=[①②③④⑤])/;
const QNUM_RE = /(?:^|\n)\s*(\d{1,3})\s*[\.．。]\s+/g;

/**
 * @param {string} text
 * @returns {{ number: number, start: number }[]}
 */
export function findQuestionMarkers(text, numberHint = null) {
  const src = String(text || '');
  const markers = [];
  const re = new RegExp(QNUM_RE.source, 'g');
  let m;
  while ((m = re.exec(src)) !== null) {
    const number = Number(m[1]);
    if (!Number.isFinite(number)) continue;
    if (Array.isArray(numberHint) && numberHint.length === 2) {
      const [lo, hi] = numberHint;
      if (number < lo || number > hi) continue;
    }
    if (markers.some((x) => x.number === number)) continue;
    markers.push({ number, start: m.index + (m[0].startsWith('\n') ? 1 : 0) });
  }
  // fallback: allow denser numbering without hint filter when nothing found
  if (!markers.length && Array.isArray(numberHint)) {
    const re2 = new RegExp(QNUM_RE.source, 'g');
    while ((m = re2.exec(src)) !== null) {
      const number = Number(m[1]);
      if (!Number.isFinite(number)) continue;
      if (markers.some((x) => x.number === number)) continue;
      markers.push({ number, start: m.index });
    }
  }
  return markers.sort((a, b) => a.start - b.start);
}

/**
 * @param {string} body
 * @returns {string[]}
 */
export function parseChoices(body) {
  const src = String(body || '');
  const parts = src.split(CHOICE_SPLIT).filter((p) => /^[①②③④⑤]/.test(p.trim()));
  if (parts.length >= 2) {
    return parts.slice(0, 5).map((p) => p.replace(/^[①②③④⑤]\s*/, '').trim());
  }
  // numbered 1)~5) fallback
  const alt = [];
  const altRe = /(?:^|\n)\s*([1-5])\s*[\)\.]\s*([^\n]+)/g;
  let m;
  while ((m = altRe.exec(src)) !== null) {
    alt[Number(m[1]) - 1] = m[2].trim();
  }
  return alt.filter(Boolean);
}

/**
 * Extract table-ish lines.
 * @param {string} body
 */
export function extractTable(body) {
  const lines = String(body || '').split(/\n/).map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) =>
    /[|\t]/.test(l)
    || /(일자|적요|수량|단가|금액|구분|차변|대변)/.test(l),
  );
  if (!tableLines.length) return null;
  return {
    rawLines: tableLines,
    markdown: tableLines.join('\n'),
  };
}

/**
 * Parse questions from one subject text block.
 * @param {{ text: string, numberHint?: number[]|null, pageOffsets?: Array<[number, number]> }} input
 */
export function parseQuestions(input = {}) {
  const text = String(input.text || '');
  const markers = findQuestionMarkers(text, input.numberHint || null);
  const pageOffsets = Array.isArray(input.pageOffsets) ? input.pageOffsets : [[1, 0]];
  const questions = [];

  for (let i = 0; i < markers.length; i += 1) {
    const { number, start } = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    const raw = text.slice(start, end).trim();
    const withoutNum = raw.replace(/^\s*\d{1,3}\s*[\.．。]\s*/, '');
    const choices = parseChoices(withoutNum);
    let stem = withoutNum;
    const firstChoice = withoutNum.search(/[①②③④⑤]/);
    if (firstChoice >= 0) stem = withoutNum.slice(0, firstChoice).trim();
    const table = extractTable(stem);
    let page = 1;
    for (const [p, off] of pageOffsets) {
      if (off <= start) page = p;
    }
    questions.push({
      number,
      question: stem,
      choices,
      table: table?.markdown || null,
      hasTable: Boolean(table),
      hasCalculation: /[￦×÷=%]|원가|금액|계산/.test(stem),
      page,
      raw,
      choiceCount: choices.length,
      ocrQualityHint: choices.length >= 4 ? 90 : choices.length >= 2 ? 70 : 40,
    });
  }

  return {
    count: questions.length,
    questions,
    version: QUESTION_PARSER_VERSION,
  };
}

/**
 * Build page offsets from pages[].
 * @param {string[]} pages
 */
export function buildPageOffsets(pages = []) {
  const offsets = [];
  let pos = 0;
  for (let i = 0; i < pages.length; i += 1) {
    offsets.push([i + 1, pos]);
    pos += String(pages[i] || '').length + 1;
  }
  return offsets;
}

export default {
  QUESTION_PARSER_VERSION,
  findQuestionMarkers,
  parseChoices,
  extractTable,
  parseQuestions,
  buildPageOffsets,
};
