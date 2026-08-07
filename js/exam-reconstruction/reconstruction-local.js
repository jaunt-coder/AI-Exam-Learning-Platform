/**
 * Sprint-17D.6 — Local (offline) exam reconstruction from Resolved Question text
 * Improves spacing / extracts HTML tables when present — never invents answers.
 */

import { normalizeQuestionLayout } from './reconstruction-schema.js';

/**
 * Heuristic restore from DB fields (originalQuestion preferred).
 * @param {object} question
 * @param {{ sourcePage?: number, sourceFile?: string }} [locate]
 */
export function reconstructLocally(question = {}, locate = {}) {
  const stemRaw = String(
    question.originalQuestion || question.question || question.stem || '',
  );
  const questionText = restoreSpacing(stemRaw);
  const tables = extractTables(stemRaw, question);
  const formulaBlocks = extractFormulas(stemRaw);
  const choices = Array.isArray(question.choices)
    ? question.choices.map((c) => String(c ?? '').trim())
    : [];

  return normalizeQuestionLayout({
    questionId: question.questionId || question.id || null,
    questionText: stripChoiceBlock(questionText),
    tables,
    formulaBlocks,
    figureReferences: question.figureHtml
      ? [{ id: 'fig1', html: String(question.figureHtml), note: '' }]
      : [],
    choices,
    sourcePage: locate.sourcePage ?? question.source?.page ?? null,
    sourceFile: locate.sourceFile ?? question.source?.sourceFile ?? null,
    footnote: '',
    provider: 'LOCAL_RECONSTRUCTION',
    reconstructedAt: new Date().toISOString(),
  });
}

function restoreSpacing(text) {
  let s = String(text || '');
  /* common OCR glue repairs (inventory exam) */
  s = s
    .replace(/종합원\s*가/g, '종합원가')
    .replace(/단위완성\s*도/g, '단위완성도')
    .replace(/기말재\s*고/g, '기말재고')
    .replace(/기초재\s*고/g, '기초재고')
    .replace(/매출원\s*가/g, '매출원가')
    .replace(/재고자\s*산/g, '재고자산')
    .replace(/순실현가능가\s*치/g, '순실현가능가치')
    .replace(/([가-힣])(\d)/g, '$1 $2')
    .replace(/(\d)([가-힣])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

function stripChoiceBlock(text) {
  return String(text || '')
    .replace(/\n?\s*[①②③④⑤].*$/s, '')
    .trim() || String(text || '').trim();
}

function extractTables(stem, question) {
  const tables = [];
  if (typeof question.tableHtml === 'string' && /<table/i.test(question.tableHtml)) {
    tables.push({ id: 't1', html: question.tableHtml, caption: '' });
  } else if (typeof question.table === 'string' && /<table/i.test(question.table)) {
    tables.push({ id: 't1', html: question.table, caption: '' });
  } else if (question.table?.html) {
    tables.push({ id: 't1', html: String(question.table.html), caption: '' });
  }

  const md = String(stem).match(/(?:\|.+\|(?:\r?\n\|[-:| ]+\|)?(?:\r?\n\|.+\|)+)/);
  if (md && !tables.length) {
    tables.push({ id: 't1', html: markdownTableToHtml(md[0]), caption: '' });
  }

  /* Detect “다음 자료” blocks with tab/space aligned rows */
  if (!tables.length && /다음\s*(자료|표|정보)/.test(stem)) {
    const block = extractDataBlock(stem);
    if (block) tables.push({ id: 't1', html: block, caption: '다음 자료' });
  }

  return tables;
}

function extractDataBlock(stem) {
  const lines = String(stem).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const start = lines.findIndex((l) => /다음\s*(자료|표|정보)/.test(l));
  if (start < 0) return null;
  const rows = [];
  for (let i = start + 1; i < lines.length && i < start + 12; i += 1) {
    if (/^[①②③④⑤]/.test(lines[i])) break;
    if (/^\?/.test(lines[i]) || /물음|물음에/.test(lines[i])) break;
    if (/\d/.test(lines[i]) && lines[i].length < 120) rows.push(lines[i]);
  }
  if (rows.length < 2) return null;
  const htmlRows = rows.map((r) => {
    const cells = r.split(/\s{2,}|\t+/).filter(Boolean);
    if (cells.length < 2) {
      return `<tr><td>${escapeHtml(r)}</td></tr>`;
    }
    return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table>${htmlRows}</table>`;
}

function markdownTableToHtml(md) {
  const lines = String(md).trim().split(/\r?\n/).filter((l) => l.includes('|'));
  const rows = lines.filter((l) => !/^\|?\s*[-:| ]+\s*\|?$/.test(l));
  const htmlRows = rows.map((line) => {
    const cells = line.split('|').map((c) => c.trim()).filter((c, i, a) => !(i === 0 && !c) && !(i === a.length - 1 && !c));
    return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table>${htmlRows}</table>`;
}

function extractFormulas(stem) {
  const blocks = [];
  const re = /([A-Za-z가-힣0-9]+)\s*=\s*([^\n。．]{3,80})/g;
  let m = re.exec(stem);
  let i = 0;
  while (m && i < 6) {
    blocks.push({ latex: '', text: `${m[1]} = ${m[2].trim()}` });
    i += 1;
    m = re.exec(stem);
  }
  return blocks;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default { reconstructLocally };
