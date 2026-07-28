/**
 * Sprint-19B — Universal Import Engine: PDF / text loader
 * Never writes Question / Pattern / Statistics product DBs.
 * Works with pre-extracted text or browser Vision OCR output.
 */

export const PDF_LOADER_VERSION = '19B';

/**
 * @param {string} fileName
 * @returns {'exam_1'|'exam_2'|'answer'|'other'}
 */
export function classifyExamFile(fileName) {
  const name = String(fileName || '').toLowerCase();
  if (/^exam_1\./.test(name) || name === 'exam_1') return 'exam_1';
  if (/^exam_2\./.test(name) || name === 'exam_2') return 'exam_2';
  if (/^answer\./.test(name) || name === 'answer') return 'answer';
  return 'other';
}

/**
 * Normalize pages from text (form-feed or page markers).
 * @param {string} text
 * @returns {string[]}
 */
export function splitPages(text) {
  const raw = String(text || '');
  if (raw.includes('\f')) {
    return raw.split('\f').map((p) => p.trimEnd());
  }
  const byMarker = raw.split(/\n(?=[-–—]{0,3}\s*page\s*\d+)/i);
  if (byMarker.length > 1) return byMarker.map((p) => p.trimEnd());
  return [raw];
}

/**
 * Build a loaded document from text (OCR or text-layer).
 * @param {{
 *   text?: string,
 *   pages?: string[],
 *   sourcePath?: string,
 *   usedOcr?: boolean,
 *   ocrQuality?: number,
 * }} input
 */
export function loadDocumentFromText(input = {}) {
  const pages = Array.isArray(input.pages) && input.pages.length
    ? input.pages.map((p) => String(p ?? ''))
    : splitPages(input.text || '');
  const text = pages.join('\n');
  const nonEmpty = pages.filter((p) => p.trim()).length;
  const ocrQuality = typeof input.ocrQuality === 'number'
    ? input.ocrQuality
    : (text.trim() ? Math.min(100, 40 + nonEmpty * 8) : 0);

  return {
    text,
    pages,
    sourcePath: input.sourcePath || null,
    sourceKind: classifyExamFile(String(input.sourcePath || '').split(/[/\\]/).pop() || ''),
    usedOcr: Boolean(input.usedOcr),
    pageCount: pages.length,
    ocrQuality,
    loadedAt: new Date().toISOString(),
    version: PDF_LOADER_VERSION,
  };
}

/**
 * Manifest entry for a discovered PDF (metadata only — no binary parse in browser).
 * @param {{ year: number, role: string, path: string, ext?: string, bytes?: number }} entry
 */
export function buildPdfManifestEntry(entry = {}) {
  return {
    year: Number(entry.year) || null,
    role: entry.role || classifyExamFile(entry.path),
    path: entry.path || null,
    ext: entry.ext || String(entry.path || '').split('.').pop()?.toLowerCase() || null,
    bytes: entry.bytes ?? null,
  };
}

/**
 * Estimate OCR quality from text density.
 * @param {string} text
 */
export function estimateOcrQuality(text) {
  const t = String(text || '').trim();
  if (!t) return 0;
  const korean = (t.match(/[가-힣]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  const choices = (t.match(/[①②③④⑤]/g) || []).length;
  const score = Math.min(100, Math.round(
    20
    + Math.min(40, korean / 80)
    + Math.min(20, digits / 10)
    + Math.min(20, choices * 2),
  ));
  return score;
}

export default {
  PDF_LOADER_VERSION,
  classifyExamFile,
  splitPages,
  loadDocumentFromText,
  buildPdfManifestEntry,
  estimateOcrQuality,
};
