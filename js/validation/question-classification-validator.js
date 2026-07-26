/**
 * Sprint-11D — Question Classification Integrity Gate
 * Read-only validation layer. Does not mutate Question / Pattern / Runtime / Policy.
 */

/** @typedef {{ questionId: string, currentChapter: string|null, currentPattern: string|null, detectedChapter: string|null, detectedPatternFamily: string|null, confidence: 'high'|'medium'|'low'|'none', flags: string[], keywordHits: object }} ClassificationVerdict */

export const INTEGRITY_REPORT_PATH = 'data/question-integrity-report.json';

/**
 * Whitespace-tolerant OCR text normalize.
 * @param {string} text
 */
export function normalizeExamText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, '');
}

/**
 * Chapter content signatures (keyword packs).
 * ACC_INV requires inventory keywords; COST_PROCESS / ACC_COST use process-costing keywords.
 */
export const CHAPTER_SIGNATURES = Object.freeze({
  ACC_COST: Object.freeze({
    keywords: Object.freeze([
      '종합원가계산',
      '완성품환산량',
      '가중평균법',
      '선입선출법',
      '환산량',
      '기초재공품',
      '기말재공품',
      '당기투입량',
      '당기완성량',
      '가공원가',
      '전환원가',
    ]),
    minHits: 2,
  }),
  ACC_INV: Object.freeze({
    keywords: Object.freeze([
      '재고자산',
      '매출원가',
      '저가법',
      '재고평가',
      '재고평가손실',
      '재고감모',
      '상품매입',
      '원재료',
      '재고자산감모손실',
    ]),
    minHits: 1,
  }),
  ACC_PPE: Object.freeze({
    keywords: Object.freeze([
      '유형자산',
      '감가상각',
      '취득원가',
      '내용연수',
      '잔존가치',
    ]),
    minHits: 2,
  }),
  ACC_REV: Object.freeze({
    keywords: Object.freeze(['수익인식', '매출', '이행의무', '계약부채']),
    minHits: 2,
  }),
});

/**
 * Pattern-family signatures (content → expected family).
 */
export const PATTERN_FAMILY_SIGNATURES = Object.freeze({
  COST_PROCESS: Object.freeze({
    keywords: Object.freeze([
      '종합원가계산',
      '완성품환산량',
      '가중평균법',
      '선입선출법',
      '환산량',
    ]),
    minHits: 2,
    expectedChapter: 'ACC_COST',
    allowedPatternPrefixes: Object.freeze([
      'COST_PROCESS',
      'ACC_COST',
    ]),
  }),
  ACC_INV: Object.freeze({
    keywords: Object.freeze([
      '재고자산',
      '저가법',
      '재고평가',
      '매출원가',
    ]),
    minHits: 1,
    expectedChapter: 'ACC_INV',
    allowedPatternPrefixes: Object.freeze(['ACC_INV']),
  }),
});

/**
 * Count keyword hits against normalized text.
 * @param {string} normalized
 * @param {string[]} keywords
 */
export function countKeywordHits(normalized, keywords) {
  const hits = [];
  for (const kw of keywords || []) {
    const needle = normalizeExamText(kw);
    if (needle && normalized.includes(needle)) hits.push(kw);
  }
  return hits;
}

/**
 * Score chapter signatures against question text.
 * @param {string} normalized
 */
export function detectChapterFromText(normalized) {
  let best = null;
  let bestHits = [];
  for (const [chapterId, sig] of Object.entries(CHAPTER_SIGNATURES)) {
    const hits = countKeywordHits(normalized, sig.keywords);
    if (hits.length < sig.minHits) continue;
    if (!best || hits.length > bestHits.length) {
      best = chapterId;
      bestHits = hits;
    }
  }
  return { chapterId: best, hits: bestHits };
}

/**
 * Score pattern-family signatures.
 * @param {string} normalized
 */
export function detectPatternFamilyFromText(normalized) {
  let best = null;
  let bestHits = [];
  let bestSig = null;
  for (const [family, sig] of Object.entries(PATTERN_FAMILY_SIGNATURES)) {
    const hits = countKeywordHits(normalized, sig.keywords);
    if (hits.length < sig.minHits) continue;
    if (!best || hits.length > bestHits.length) {
      best = family;
      bestHits = hits;
      bestSig = sig;
    }
  }
  return { family: best, hits: bestHits, signature: bestSig };
}

/**
 * Resolve effective pattern id (primaryPattern preferred).
 * @param {object} question
 */
export function effectivePatternId(question) {
  if (!question || typeof question !== 'object') return null;
  if (question.primaryPattern != null && question.primaryPattern !== '') {
    return String(question.primaryPattern);
  }
  if (question.patternId != null && question.patternId !== '') {
    return String(question.patternId);
  }
  return null;
}

/**
 * @param {string|null} patternId
 * @param {string[]} allowedPrefixes
 */
export function patternMatchesAllowed(patternId, allowedPrefixes) {
  if (!patternId) return false;
  const id = String(patternId);
  return (allowedPrefixes || []).some(
    (p) => id === p || id.startsWith(`${p}_`) || id.startsWith(p),
  );
}

/**
 * questionType vs content / calculation flags.
 * @param {object} question
 * @param {string|null} detectedFamily
 */
export function detectQuestionTypeMismatch(question, detectedFamily) {
  const qType = String(question?.questionType || '');
  const hasCalc = question?.hasCalculation === true;
  if (
    detectedFamily === 'COST_PROCESS' &&
    qType &&
    qType !== 'calculation' &&
    !hasCalc
  ) {
    return true;
  }
  if (qType === 'standard' && hasCalc === false && detectedFamily === 'COST_PROCESS') {
    return true;
  }
  return false;
}

/**
 * subjectId vs chapterId structural mismatch.
 * @param {object} question
 */
export function detectSubjectChapterMismatch(question) {
  const subjectId = String(question?.subjectId || '');
  const chapterId = String(question?.chapterId || '');
  if (!subjectId || !chapterId) return false;
  if (subjectId === 'ACC') {
    return !(chapterId.startsWith('ACC_') || chapterId.startsWith('COST'));
  }
  return !chapterId.startsWith(`${subjectId}_`) && !chapterId.startsWith(subjectId);
}

/**
 * Confidence from hit strength and flag count.
 * @param {number} hitCount
 * @param {string[]} flags
 */
export function resolveConfidence(hitCount, flags) {
  if (!flags.length) return 'none';
  if (hitCount >= 4 || (hitCount >= 3 && flags.length >= 2)) return 'high';
  if (hitCount >= 2) return 'medium';
  return 'low';
}

/**
 * Validate a single question classification (read-only).
 * @param {object} question
 * @returns {ClassificationVerdict}
 */
export function validateQuestionClassification(question = {}) {
  const questionId = String(
    question.questionId || question.id || 'UNKNOWN',
  );
  const currentChapter = question.chapterId != null
    ? String(question.chapterId)
    : null;
  const currentPattern = effectivePatternId(question);

  const rawText = [
    question.originalQuestion,
    question.question,
    question.title,
  ]
    .filter(Boolean)
    .join('\n');
  const normalized = normalizeExamText(rawText);

  const chapterDetect = detectChapterFromText(normalized);
  const patternDetect = detectPatternFamilyFromText(normalized);

  /** Prefer COST_PROCESS family chapter when present */
  let detectedChapter = chapterDetect.chapterId;
  if (patternDetect.family === 'COST_PROCESS') {
    detectedChapter =
      patternDetect.signature?.expectedChapter || 'ACC_COST';
  }

  const flags = [];
  const keywordHits = {
    chapter: chapterDetect.hits,
    patternFamily: patternDetect.hits,
  };

  if (
    detectedChapter &&
    currentChapter &&
    detectedChapter !== currentChapter
  ) {
    flags.push('CHAPTER_MISMATCH');
  }

  if (patternDetect.family && patternDetect.signature) {
    const allowed = patternDetect.signature.allowedPatternPrefixes;
    if (!patternMatchesAllowed(currentPattern, allowed)) {
      flags.push('PATTERN_MISMATCH');
    }
  }

  if (detectQuestionTypeMismatch(question, patternDetect.family)) {
    flags.push('QUESTION_TYPE_MISMATCH');
  }

  if (detectSubjectChapterMismatch(question)) {
    flags.push('SUBJECT_CHAPTER_MISMATCH');
  }

  /* Pattern prefix vs chapter prefix soft check */
  if (
    currentPattern &&
    currentChapter &&
    currentPattern.startsWith('COST_') &&
    currentChapter.startsWith('ACC_INV')
  ) {
    if (!flags.includes('CHAPTER_MISMATCH')) {
      flags.push('CHAPTER_MISMATCH');
      if (!detectedChapter) detectedChapter = 'ACC_COST';
    }
  }

  const hitCount = Math.max(
    chapterDetect.hits.length,
    patternDetect.hits.length,
  );
  const confidence = resolveConfidence(hitCount, flags);

  return {
    questionId,
    currentChapter,
    currentPattern,
    detectedChapter: detectedChapter || null,
    detectedPatternFamily: patternDetect.family || null,
    confidence,
    flags,
    keywordHits,
  };
}

/**
 * Validate a list of questions and build integrity report payload.
 * @param {object[]} questions
 * @param {{ generatedAt?: string }} [options]
 */
export function buildQuestionIntegrityReport(questions = [], options = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const verdicts = list.map((q) => validateQuestionClassification(q));
  const mismatched = verdicts.filter((v) => v.flags.length > 0);
  const highRisk = mismatched.filter((v) => v.confidence === 'high');
  const reviewRequired = mismatched.filter(
    (v) => v.confidence === 'high' || v.confidence === 'medium',
  );

  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    totalChecked: list.length,
    mismatchCount: mismatched.length,
    highRiskQuestions: highRisk,
    reviewRequired,
    schemaVersion: 'v1',
    sprint: 'Sprint-11D',
  };
}

export default {
  INTEGRITY_REPORT_PATH,
  CHAPTER_SIGNATURES,
  PATTERN_FAMILY_SIGNATURES,
  normalizeExamText,
  countKeywordHits,
  detectChapterFromText,
  detectPatternFamilyFromText,
  effectivePatternId,
  validateQuestionClassification,
  buildQuestionIntegrityReport,
};
