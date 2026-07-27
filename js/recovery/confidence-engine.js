/**
 * Sprint-12B — Confidence Engine
 * HIGH >= 97%, MEDIUM 90~96%, LOW < 90%
 */

export const CONFIDENCE_THRESHOLDS = Object.freeze({
  HIGH: 0.97,
  MEDIUM: 0.9,
});

/**
 * @param {number} score 0..1
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export function classifyConfidence(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'LOW';
  if (n >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (n >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

/**
 * Score a single change.
 * @param {object} change
 * @param {{ detections?: string[] }} [context]
 */
export function scoreChange(change = {}, context = {}) {
  let score = 0.9;
  const field = String(change.field || change.type || '').toLowerCase();
  const detections = context.detections || [];

  if (field === 'table' || change.type === 'TABLE') {
    score = 0.94;
    if (change.after?.headers?.length >= 3) score += 0.03;
    if ((change.after?.rows || []).length >= 3) score += 0.02;
    if (detections.includes('MISSING_TABLE')) score += 0.01;
  } else if (field === 'question' || change.type === 'QUESTION') {
    score = 0.92;
    if (typeof change.after === 'string' && change.after.includes('\n')) score += 0.03;
    if (detections.includes('OCR_ERROR')) score += 0.02;
  } else if (field === 'choices' || change.type === 'CHOICE') {
    score = 0.91;
    if (Array.isArray(change.after) && change.after.length === 5) score += 0.04;
  } else if (field === 'number') {
    score = 0.9;
  } else if (field === 'formula') {
    score = 0.89;
  } else if (field === 'layout') {
    score = 0.88;
  }

  if (change.explain && String(change.explain).length > 24) score += 0.01;
  score = Math.max(0, Math.min(0.995, score));
  const confidence = round4(score);
  return {
    ...change,
    confidence,
    level: classifyConfidence(confidence),
  };
}

/**
 * @param {object[]} changes
 * @param {{ detections?: string[] }} [context]
 */
export function computeConfidence(changes = [], context = {}) {
  const scored = (Array.isArray(changes) ? changes : []).map((c) =>
    scoreChange(c, context),
  );
  const avg =
    scored.length === 0
      ? 0
      : scored.reduce((a, b) => a + b.confidence, 0) / scored.length;
  const byLevel = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const s of scored) byLevel[s.level] += 1;
  return {
    confidence: round4(avg),
    level: classifyConfidence(avg),
    byLevel,
    changes: scored,
    thresholds: CONFIDENCE_THRESHOLDS,
  };
}

export default {
  CONFIDENCE_THRESHOLDS,
  classifyConfidence,
  scoreChange,
  computeConfidence,
};
