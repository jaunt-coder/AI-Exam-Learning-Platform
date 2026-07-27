/**
 * Sprint-12B — Suggestion Engine (local AI Recovery heuristics).
 * Never writes Question DB. Output = Suggestion Layer only.
 */

import { serializeMarkdownTable } from '../reviewer/table-editor.js';

export const SMART_DETECTIONS = Object.freeze([
  'MISSING_TABLE',
  'BROKEN_TABLE',
  'BROKEN_CHOICE',
  'BROKEN_FORMULA',
  'SUSPICIOUS_NUMBER',
  'OCR_ERROR',
  'LAYOUT_ERROR',
]);

/**
 * @param {string} text
 */
export function normalizeOcrText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractText(question = {}) {
  const original = String(question.originalQuestion || '');
  const display = String(question.question || '');
  return {
    original,
    display,
    raw: [original, display].filter(Boolean).join('\n'),
    compact: normalizeOcrText([original, display].filter(Boolean).join('\n')).replace(
      /\s+/g,
      '',
    ),
  };
}

/**
 * Generate recovery pack with `changes[]` schema.
 * @param {object} question
 * @param {{ override?: object|null, pdfMeta?: object }} [context]
 */
export function generateRecoverySuggestions(question = {}, context = {}) {
  const text = extractText(question);
  const detections = detectIssues(question, text);
  const changes = [];

  const table = buildTableChange(question, text);
  if (table) changes.push(table);

  const qChange = buildQuestionChange(question, text);
  if (qChange) changes.push(qChange);

  const choice = buildChoiceChange(question);
  if (choice) changes.push(choice);

  const number = buildNumberChange(text);
  if (number) changes.push(number);

  const formula = buildFormulaChange(text);
  if (formula) changes.push(formula);

  const layout = buildLayoutChange(text, detections);
  if (layout) changes.push(layout);

  /* Override-aware: if override already fixed field, skip duplicate */
  const ov = context.override?.override || context.override || null;
  const filtered = changes.filter((c) => {
    if (!ov) return true;
    if (c.field === 'table' && ov.table) return false;
    if (c.field === 'question' && ov.question) return false;
    if (c.field === 'choices' && Array.isArray(ov.choices)) return false;
    return true;
  });

  return {
    questionId: question.questionId || question.id || 'UNKNOWN',
    changes: filtered,
    detections,
    pdfMeta: context.pdfMeta || extractPdfMeta(question),
    generatedAt: new Date().toISOString(),
    engine: 'local-ai-recovery-v1',
  };
}

function extractPdfMeta(question) {
  const source = question.source || {};
  return {
    page: source.page ?? null,
    questionNumber: source.questionNumber ?? null,
    year: source.year || question.year || null,
    sourceFile: source.sourceFile || null,
  };
}

function detectIssues(question, text) {
  const out = [];
  const { raw, compact } = text;
  if (
    /기초재공품|당기투입|당기완성|기말재공/.test(compact) &&
    !String(question.table || '').includes('|')
  ) {
    out.push('MISSING_TABLE');
  }
  if (question.table && String(question.table).split('\n').length < 3) {
    out.push('BROKEN_TABLE');
  }
  if (!Array.isArray(question.choices) || question.choices.length !== 5) {
    out.push('BROKEN_CHOICE');
  }
  if (/완성품환산|가중평균|선입선출/.test(compact) && /원\s*가|환\s*산/.test(raw)) {
    out.push('BROKEN_FORMULA');
  }
  if (/\d{4,}/.test(compact) && !/\d{1,3}(?:,\d{3})+/.test(raw)) {
    out.push('SUSPICIOUS_NUMBER');
  }
  if (/[가-힣]\s+[가-힣]/.test(raw) || /종합원\s*가/.test(raw)) {
    out.push('OCR_ERROR');
  }
  if (/○/.test(raw) || (raw.match(/\n/g) || []).length < 2) {
    out.push('LAYOUT_ERROR');
  }
  return [...new Set(out)].filter((d) => SMART_DETECTIONS.includes(d));
}

function buildTableChange(question, text) {
  const { compact } = text;
  const hasProcess =
    /기초재공품/.test(compact) &&
    (/당기투입/.test(compact) || /당기완성/.test(compact) || /기말재공/.test(compact));
  if (!hasProcess) return null;

  const rows = [];
  const qtyAll = [...compact.matchAll(/([\d,]{4,}|[\d]{4,})/g)].map((m) =>
    formatNumber(m[1]),
  );
  const pctAll = [...compact.matchAll(/(\d{1,3})%/g)].map((m) => m[1]);

  const mBase = compact.match(/기초재공품.*?([\d,]+).*?(\d{1,3})%?/);
  if (mBase) rows.push(['기초재공품', formatNumber(mBase[1]), `${mBase[2]}%`]);
  else if (qtyAll[0]) {
    rows.push(['기초재공품', qtyAll[0], pctAll[0] ? `${pctAll[0]}%` : '20%']);
  }

  const mIn = compact.match(/당기투입량?.*?([\d,]+)/);
  if (mIn) rows.push(['당기투입량', formatNumber(mIn[1]), '']);
  else if (qtyAll[1]) rows.push(['당기투입량', qtyAll[1], '']);

  const mDone = compact.match(/당기완성량?.*?([\d,]+)/);
  if (mDone) rows.push(['당기완성량', formatNumber(mDone[1]), '']);
  else if (qtyAll[2]) rows.push(['당기완성량', qtyAll[2], '']);

  const mEnd = compact.match(/기말재공품.*?([\d,]+).*?(\d{1,3})%?/);
  if (mEnd) rows.push(['기말재공품', formatNumber(mEnd[1]), `${mEnd[2]}%`]);
  else {
    rows.push([
      '기말재공품',
      qtyAll[3] || '',
      pctAll[1] ? `${pctAll[1]}%` : '40%',
    ]);
  }

  if (rows.length < 2) return null;
  const headers = ['구분', '수량', '완성도'];
  return {
    field: 'table',
    type: 'TABLE',
    before: question.table || null,
    after: { headers, rows },
    afterMarkdown: serializeMarkdownTable(headers, rows),
    explain:
      '원본 PDF에는 3열 표(구분·수량·완성도)가 존재합니다. OCR 과정에서 Header가 누락되었습니다.',
  };
}

function buildQuestionChange(question, text) {
  const raw = text.raw;
  if (!raw || raw.length < 20) return null;
  let repaired = raw
    .replace(/종합원\s*가계산/g, '종합원가계산')
    .replace(/원재\s*\n?\s*료/g, '원재료')
    .replace(/가공원\s*가/g, '가공원가')
    .replace(/전환원\s*,?\s*가/g, '전환원가')
    .replace(/완성품\s*,?\s*환산량/g, '완성품환산량')
    .replace(/단위완성\s*도/g, '단위완성도')
    .replace(/([가-힣])\s+(?=[가-힣])/g, '$1')
    .replace(/○/g, '\n○ ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const current = String(question.question || question.originalQuestion || '');
  if (normalizeOcrText(repaired) === normalizeOcrText(current) && repaired === current) {
    return null;
  }
  return {
    field: 'question',
    type: 'QUESTION',
    before: current,
    after: repaired,
    explain:
      'OCR 과정에서 한글 음절 사이 공백과 줄바꿈이 깨졌습니다. 문단·특수문자를 복원합니다.',
  };
}

function buildChoiceChange(question) {
  const choices = Array.isArray(question.choices) ? question.choices.map(String) : [];
  if (!choices.length) return null;
  if (choices.length === 5) {
    const cleaned = choices.map((c) => c.replace(/\s+/g, ' ').trim());
    if (cleaned.every((c, i) => c === choices[i])) return null;
    return {
      field: 'choices',
      type: 'CHOICE',
      before: choices,
      after: cleaned,
      explain: '선택지 공백·단위 표기를 OCR 기준으로 정규화했습니다.',
    };
  }
  const after = choices.slice(0, 5);
  while (after.length < 5) after.push('');
  return {
    field: 'choices',
    type: 'CHOICE',
    before: choices,
    after,
    explain: '보기 개수가 5개가 아닙니다. 누락/초과 보기를 정리할 것을 제안합니다.',
  };
}

function buildNumberChange(text) {
  const found = [];
  const re = /\b(\d{4,})\b/g;
  let m;
  while ((m = re.exec(text.raw))) {
    if (!m[1].includes(',')) {
      found.push({ before: m[1], after: formatNumber(m[1]) });
    }
  }
  if (!found.length) return null;
  return {
    field: 'number',
    type: 'NUMBER',
    before: found.map((f) => f.before),
    after: found.map((f) => f.after),
    explain: `숫자 ${found[0].before}에 천 단위 구분 쉼표가 누락되었을 수 있습니다.`,
  };
}

function buildFormulaChange(text) {
  if (!/완성품환산량|가중평균법|선입선출법/.test(text.compact)) return null;
  return {
    field: 'formula',
    type: 'FORMULA',
    before: null,
    after: {
      expression: 'EU_가중평균 − EU_선입선출 = 가공원가 환산량 차이',
    },
    explain: '수식·환산량 관계가 OCR 문장에 흩어져 있어 핵심 식을 분리 표기합니다.',
  };
}

function buildLayoutChange(text, detections) {
  if (!detections.includes('LAYOUT_ERROR')) return null;
  return {
    field: 'layout',
    type: 'LAYOUT',
    before: { paragraphs: 1 },
    after: { markers: '○', paragraphs: 'restored' },
    explain: '표·들여쓰기·문단 마커(○)가 OCR에서 단일 문단으로 병합되었습니다.',
  };
}

function formatNumber(value) {
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return String(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default {
  SMART_DETECTIONS,
  normalizeOcrText,
  generateRecoverySuggestions,
};
