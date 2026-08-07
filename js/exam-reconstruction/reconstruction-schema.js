/**
 * Sprint-17D.6 — question-layout schema helpers
 * Overlay only — never writes Question / Pattern DB.
 */

export const LAYOUT_SCHEMA_VERSION = '17D.6';
export const LAYOUT_SCHEMA_PATH = 'data/schemas/question-layout.json';

/**
 * @param {object} raw
 */
export function normalizeQuestionLayout(raw = {}) {
  const tables = Array.isArray(raw.tables)
    ? raw.tables.map((t, i) => ({
      id: String(t?.id || `t${i + 1}`),
      html: String(t?.html || t?.tableHtml || ''),
      caption: String(t?.caption || ''),
    })).filter((t) => t.html.trim())
    : [];

  /* Compat: single tableHtml from Vision */
  if (!tables.length && raw.tableHtml) {
    const html = String(raw.tableHtml).trim();
    if (html) tables.push({ id: 't1', html, caption: '' });
  }

  const formulaBlocks = Array.isArray(raw.formulaBlocks)
    ? raw.formulaBlocks.map((f) => ({
      latex: String(f?.latex || ''),
      text: String(f?.text || f || ''),
    }))
    : Array.isArray(raw.formula)
      ? raw.formula.map((f) => ({ latex: '', text: String(f ?? '') }))
      : [];

  const figureReferences = Array.isArray(raw.figureReferences)
    ? raw.figureReferences.map((f, i) => ({
      id: String(f?.id || `fig${i + 1}`),
      html: String(f?.html || ''),
      note: String(f?.note || ''),
    }))
    : raw.figureHtml
      ? [{ id: 'fig1', html: String(raw.figureHtml), note: '' }]
      : [];

  const choices = Array.isArray(raw.choices)
    ? raw.choices.map((c) => String(c ?? '').trim())
    : [];

  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    questionId: raw.questionId || null,
    questionText: String(raw.questionText ?? raw.question ?? '').trim(),
    tables,
    formulaBlocks,
    figureReferences,
    choices,
    sourcePage:
      raw.sourcePage == null || raw.sourcePage === ''
        ? null
        : Number(raw.sourcePage),
    sourceFile: raw.sourceFile == null ? null : String(raw.sourceFile),
    footnote: String(raw.footnote || ''),
    reconstructedAt: raw.reconstructedAt || null,
    provider: raw.provider || null,
  };
}

/**
 * Flatten tables to HTML for Professor prompt / reader.tableHtml.
 * @param {object} layout
 */
export function layoutTablesToHtml(layout = {}) {
  const tables = Array.isArray(layout.tables) ? layout.tables : [];
  return tables.map((t) => t.html).filter(Boolean).join('\n');
}

/**
 * Vision payload → question-layout.
 * @param {object} vision
 * @param {{ questionId?: string, sourcePage?: number, sourceFile?: string, provider?: string }} meta
 */
export function visionPayloadToLayout(vision = {}, meta = {}) {
  return normalizeQuestionLayout({
    questionId: meta.questionId || null,
    questionText: vision.question || '',
    tableHtml: vision.tableHtml || '',
    formula: vision.formula || [],
    figureHtml: vision.figureHtml || '',
    choices: vision.choices || [],
    footnote: vision.footnote || '',
    sourcePage: meta.sourcePage,
    sourceFile: meta.sourceFile,
    provider: meta.provider || 'GEMINI_VISION',
    reconstructedAt: new Date().toISOString(),
  });
}

export default {
  LAYOUT_SCHEMA_VERSION,
  LAYOUT_SCHEMA_PATH,
  normalizeQuestionLayout,
  layoutTablesToHtml,
  visionPayloadToLayout,
};
