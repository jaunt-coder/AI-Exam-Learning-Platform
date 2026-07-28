/**
 * Sprint-19C — Pattern Frequency (read-only over candidate / pattern lists)
 */

export const PATTERN_FREQUENCY_VERSION = '19C';

/**
 * Build frequency map from pattern candidates or pattern DB rows.
 * @param {Array<{ patternId?: string, patternCandidateId?: string, name?: string, questionIds?: string[], frequency?: number, hitCount?: number }>} patterns
 */
export function buildFrequencyMap(patterns = []) {
  const list = Array.isArray(patterns) ? patterns : [];
  const rows = list.map((p) => {
    const patternId = p.patternId || p.patternCandidateId || p.id || p.name;
    const frequency = Number(
      p.frequency
      ?? p.hitCount
      ?? (Array.isArray(p.questionIds) ? p.questionIds.length : 0),
    ) || 0;
    return {
      patternId,
      name: p.name || patternId,
      frequency,
      questionIds: Array.isArray(p.questionIds) ? p.questionIds : [],
      subjectId: p.subjectId || null,
    };
  });
  const totalFrequency = rows.reduce((s, r) => s + r.frequency, 0);
  return {
    version: PATTERN_FREQUENCY_VERSION,
    totalFrequency,
    patterns: rows.sort((a, b) => b.frequency - a.frequency),
  };
}

/**
 * Normalize frequency to 0–1 weight.
 */
export function frequencyWeight(frequency, totalFrequency) {
  return (Number(frequency) || 0) / Math.max(1, Number(totalFrequency) || 1);
}

export default {
  PATTERN_FREQUENCY_VERSION,
  buildFrequencyMap,
  frequencyWeight,
};
