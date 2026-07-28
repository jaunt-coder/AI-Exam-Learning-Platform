/**
 * Sprint-17B — PDF Crop
 * Crop region = current question number → next question number (auto).
 * Browser has no pdf.js dependency: returns normalized crop metadata.
 * Optional canvas render hook when globalThis.__PDF_RENDER__ is provided.
 */

/**
 * Estimate vertical crop band for a question on a page.
 * Assumes ~5 questions per page vertical layout (common exam layout).
 * @param {{ questionNumber?: number, page?: number }} locate
 * @param {{ questionsPerPage?: number, nextQuestionNumber?: number }} [options]
 */
export function computeCropRegion(locate = {}, options = {}) {
  const qn = Number(locate.questionNumber) || 1;
  const perPage = Number(options.questionsPerPage) || 5;
  const indexOnPage = ((qn - 1) % perPage);
  const nextQn =
    options.nextQuestionNumber != null
      ? Number(options.nextQuestionNumber)
      : qn + 1;

  const topRatio = clamp01(indexOnPage / perPage);
  let bottomRatio = clamp01((indexOnPage + 1) / perPage);

  /* If next question is known and on same page band, tighten */
  if (Number.isFinite(nextQn) && nextQn > qn) {
    const nextIndex = ((nextQn - 1) % perPage);
    if (nextIndex > indexOnPage) {
      bottomRatio = clamp01(nextIndex / perPage);
    }
  }

  /* padding */
  const pad = 0.02;
  const y0 = clamp01(topRatio - pad);
  const y1 = clamp01(Math.max(bottomRatio + pad, y0 + 0.12));

  return {
    page: Number(locate.page) || null,
    questionNumber: qn,
    nextQuestionNumber: nextQn,
    unit: 'ratio',
    x: 0,
    y: y0,
    width: 1,
    height: y1 - y0,
    topRatio: y0,
    bottomRatio: y1,
    pdfPath: locate.pdfPath || null,
    pdfUrl: locate.pdfUrl || null,
  };
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Crop description for Vision prompt / cache metadata.
 * @param {object} region
 */
export function describeCrop(region = {}) {
  return {
    page: region.page,
    questionNumber: region.questionNumber,
    box: {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
    },
    note: 'current question number → next question number',
  };
}

/**
 * Attempt to render cropped page image.
 * Uses optional globalThis.__PDF_RENDER__(pdfUrl, region) → Promise<dataUrl>.
 * @param {object} locate
 * @param {object} [region]
 * @returns {Promise<{ ok: boolean, dataUrl?: string, mimeType?: string, region: object, error?: string }>}
 */
export async function cropQuestionImage(locate = {}, region = null) {
  const crop = region || computeCropRegion(locate);
  const renderer = globalThis.__PDF_RENDER__;
  if (typeof renderer === 'function' && locate.pdfUrl) {
    try {
      const dataUrl = await renderer(locate.pdfUrl, crop);
      if (dataUrl && typeof dataUrl === 'string') {
        return {
          ok: true,
          dataUrl,
          mimeType: dataUrl.startsWith('data:image/jpeg')
            ? 'image/jpeg'
            : 'image/png',
          region: crop,
        };
      }
    } catch (err) {
      return {
        ok: false,
        error: err?.message || String(err),
        region: crop,
      };
    }
  }
  return {
    ok: false,
    error: 'pdf_renderer_unavailable',
    region: crop,
    /* metadata-only crop — Vision may still run with injected imageBase64 */
  };
}

export default {
  computeCropRegion,
  describeCrop,
  cropQuestionImage,
};
