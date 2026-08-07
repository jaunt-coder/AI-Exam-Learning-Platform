/**
 * Sprint-17D.6 — Apply reconstruction layout onto Resolved Question (overlay)
 * Never mutates Question DB — returns a new object.
 */

import { layoutTablesToHtml } from './reconstruction-schema.js';

/**
 * @param {object} resolved — Resolved Question
 * @param {object} layout — question-layout
 * @param {object} [meta]
 */
export function applyReconstructionOverlay(resolved, layout, meta = {}) {
  if (!resolved || !layout) return resolved;
  const next = { ...resolved };
  if (layout.questionText) {
    if (!next.originalQuestion) next.originalQuestion = next.question;
    next.question = layout.questionText;
  }
  const tableHtml = layoutTablesToHtml(layout);
  if (tableHtml) {
    next.tableHtml = tableHtml;
    next.table = tableHtml;
    next.hasTable = true;
  }
  if (Array.isArray(layout.choices) && layout.choices.some((c) => String(c).trim())) {
    next.choices = layout.choices.map((c) => String(c ?? ''));
  }
  if (layout.figureReferences?.[0]?.html) {
    next.figureHtml = layout.figureReferences[0].html;
  }
  if (Array.isArray(layout.formulaBlocks) && layout.formulaBlocks.length) {
    next.reconstructionFormulas = layout.formulaBlocks;
  }
  next._reconstruction = {
    schemaVersion: layout.schemaVersion || '17D.6',
    provider: layout.provider || meta.provider || null,
    sourcePage: layout.sourcePage,
    sourceFile: layout.sourceFile,
    quality: meta.quality || null,
    cacheHit: Boolean(meta.cacheHit),
  };
  next._reconstructed = true;
  return next;
}

/**
 * Merge layout into professor reader payload.
 * @param {object} reader — from readProblem/attachGrade
 * @param {object} layout
 */
export function applyReconstructionToReader(reader, layout, quality = null) {
  if (!reader || !layout) return reader;
  const tableHtml = layoutTablesToHtml(layout) || reader.tableHtml || '';
  return {
    ...reader,
    questionText: layout.questionText || reader.questionText,
    tableHtml,
    choices:
      Array.isArray(layout.choices) && layout.choices.some((c) => String(c).trim())
        ? layout.choices.map((c) => String(c ?? ''))
        : reader.choices,
    reconstruction: layout,
    reconstructionQuality: quality,
  };
}

export default {
  applyReconstructionOverlay,
  applyReconstructionToReader,
};
