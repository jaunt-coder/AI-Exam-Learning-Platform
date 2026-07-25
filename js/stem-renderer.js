/**
 * M2 WP-01 — Question Stem Renderer (presentation only)
 * Removes OCR line-break noise without changing wording, numbers, or meaning.
 * Does NOT rewrite, summarize, or fix terminology.
 */

const BULLET_RE = /^[○●◇◆▪•·]\s*/;
const CIRCLE_NUM_RE = /^[①②③④⑤⑥⑦⑧⑨⑩]/;

/**
 * @param {string} stemRaw
 * @returns {string} display stem (paragraphs separated by \n\n, bullets on own lines)
 */
export function renderQuestionStem(stemRaw) {
  if (stemRaw === null || stemRaw === undefined) return '';
  const raw = String(stemRaw).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').map((l) => l.trimEnd());

  /** @type {string[]} */
  const blocks = [];
  /** @type {string[]} */
  let proseBuf = [];

  const flushProse = () => {
    if (proseBuf.length === 0) return;
    const merged = proseBuf
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (merged) blocks.push(merged);
    proseBuf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushProse();
      if (blocks.length > 0 && blocks[blocks.length - 1] !== '') {
        blocks.push('');
      }
      continue;
    }
    if (BULLET_RE.test(trimmed) || CIRCLE_NUM_RE.test(trimmed)) {
      flushProse();
      blocks.push(trimmed);
      continue;
    }
    proseBuf.push(trimmed);
  }
  flushProse();

  // Collapse excess blank separators
  const out = [];
  for (const b of blocks) {
    if (b === '') {
      if (out.length && out[out.length - 1] !== '') out.push('');
    } else {
      out.push(b);
    }
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n\n');
}

/**
 * HTML-safe stem with bullet lines as list-like paragraphs.
 * @param {string} stemRaw
 * @returns {string} HTML (escaped)
 */
export function renderQuestionStemHtml(stemRaw) {
  const text = renderQuestionStem(stemRaw);
  const escape = (s) =>
    String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  return text
    .split('\n\n')
    .map((para) => {
      const e = escape(para);
      if (BULLET_RE.test(para.trim())) {
        return `<p class="stem-bullet">${e}</p>`;
      }
      return `<p class="stem-para">${e}</p>`;
    })
    .join('');
}

export default { renderQuestionStem, renderQuestionStemHtml };
