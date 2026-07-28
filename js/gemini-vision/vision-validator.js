/**
 * Sprint-17B — Vision Validator
 * Ensures HTML tables (no Markdown), Latex formulas, choices shape.
 */

import { normalizeVisionPayload } from './vision-parser.js';

/**
 * True if string looks like HTML table (not Markdown).
 * @param {string} html
 */
export function isHtmlTable(html) {
  const s = String(html || '').trim();
  if (!s) return true; /* empty allowed when no table */
  if (/^\|/.test(s) || /\n\|[-:]/.test(s)) return false;
  return /<table[\s>]/i.test(s) && /<tr[\s>]/i.test(s) && /<t[dh][\s>]/i.test(s);
}

/**
 * Convert simple Markdown table → HTML table (recovery helper).
 * @param {string} md
 */
export function markdownTableToHtml(md) {
  const lines = String(md || '')
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return '';
  const rows = lines
    .filter((l) => !/^\|?\s*:?-{3,}/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    );
  if (!rows.length) return '';
  const head = rows[0];
  const body = rows.slice(1);
  const thead = `<tr>${head.map((h) => `<td>${escapeCell(h)}</td>`).join('')}</tr>`;
  const tbody = body
    .map((r) => `<tr>${r.map((c) => `<td>${escapeCell(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table>${thead}${tbody}</table>`;
}

function escapeCell(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * @param {object} payload
 */
export function validateVisionPayload(payload) {
  const data = normalizeVisionPayload(payload);
  const issues = [];

  if (!String(data.question).trim()) issues.push('missing_question');
  if (!Array.isArray(data.choices) || data.choices.filter((c) => c.trim()).length < 4) {
    issues.push('choices_incomplete');
  }
  if (data.tableHtml && !isHtmlTable(data.tableHtml)) {
    issues.push('table_not_html');
  }
  if (/```|^\s*#/m.test(data.question)) {
    issues.push('markdown_in_question');
  }

  /* Auto-fix markdown table if present */
  let fixed = { ...data };
  if (fixed.tableHtml && !isHtmlTable(fixed.tableHtml)) {
    const html = markdownTableToHtml(fixed.tableHtml);
    if (html) {
      fixed.tableHtml = html;
      issues.push('table_converted_from_markdown');
    }
  }

  const formulaOk = Array.isArray(fixed.formula);
  const tableOk = !fixed.tableHtml || isHtmlTable(fixed.tableHtml);
  const hardFail = issues.some((i) =>
    ['missing_question', 'choices_incomplete'].includes(i),
  );

  return {
    ok: !hardFail && tableOk,
    issues,
    payload: fixed,
    tableOk,
    formulaOk,
    score: Math.max(0, 100 - issues.length * 12),
  };
}

export default {
  isHtmlTable,
  markdownTableToHtml,
  validateVisionPayload,
};
