/**
 * Sprint-19B — Batch Import
 * Discovers source/past-exams/{year} and runs Universal Import pipeline.
 */

import { classifyExamFile, loadDocumentFromText, estimateOcrQuality } from './pdf-loader.js';
import { splitYearFiles, splitExamSession } from './exam-splitter.js';
import { parseQuestions, buildPageOffsets } from './question-parser.js';
import { parseAnswerText, parseAnswerJson, mergeAnswerMaps, matchAnswers } from './answer-parser.js';
import { buildQuestionDb } from './question-builder.js';
import { buildPatternCandidates } from './pattern-builder.js';
import { buildFormulaCandidates } from './formula-builder.js';
import {
  validateQuestionDb,
  validatePatternCandidate,
  validateFormulaCandidate,
  isForbiddenProductPath,
} from './import-validator.js';
import {
  appendImportRun,
  updateImportProgress,
  subjectOutputPaths,
} from './import-storage.js';

export const BATCH_IMPORT_VERSION = '19B';

export const DEFAULT_YEAR_RANGE = Object.freeze({ from: 2018, to: 2025 });

/**
 * Discover year folders from a file index (browser/Node agnostic).
 * @param {Array<{ path: string, bytes?: number }>} fileIndex
 * @param {{ from?: number, to?: number }} [range]
 */
export function discoverPastExamYears(fileIndex = [], range = DEFAULT_YEAR_RANGE) {
  const from = range.from ?? 2018;
  const to = range.to ?? 2025;
  /** @type {Map<number, Array<{ name: string, path: string, bytes?: number }>>} */
  const byYear = new Map();

  for (const f of fileIndex) {
    const path = String(f.path || '').replace(/\\/g, '/');
    const m = path.match(/past-exams\/(\d{4})\//i) || path.match(/(?:^|\/)(\d{4})\//);
    if (!m) continue;
    const year = Number(m[1]);
    if (year < from || year > to) continue;
    const name = path.split('/').pop() || '';
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push({ name, path, bytes: f.bytes });
  }

  const years = [];
  for (let y = from; y <= to; y += 1) {
    const files = byYear.get(y) || [];
    const split = splitYearFiles({ year: y, files });
    years.push({
      year: y,
      files,
      ...split,
      explored: true,
    });
  }

  return {
    from,
    to,
    years,
    yearCount: years.length,
    exam1Count: years.filter((y) => y.hasExam1).length,
    exam2Count: years.filter((y) => y.hasExam2).length,
    answerCount: years.filter((y) => y.hasAnswer).length,
    version: BATCH_IMPORT_VERSION,
  };
}

/**
 * Import one subject text block → candidate outputs.
 * @param {object} job
 * @param {Record<number, number>} answerMap
 */
export function importSubjectJob(job = {}, answerMap = {}) {
  const pages = job.pages || [job.text || ''];
  const doc = loadDocumentFromText({
    text: job.text || pages.join('\n'),
    pages,
    sourcePath: job.sourcePath,
    usedOcr: job.usedOcr,
    ocrQuality: job.ocrQuality,
  });
  const parsed = parseQuestions({
    text: doc.text,
    numberHint: job.numberHint || null,
    pageOffsets: buildPageOffsets(doc.pages),
  });
  const matched = matchAnswers(parsed.questions, answerMap);
  const questionDb = buildQuestionDb(matched.questions, {
    subjectId: job.subjectId,
    year: job.year,
    session: job.session,
    sourcePath: job.sourcePath,
    examName: job.examName || '감정평가사',
    ocrQuality: doc.ocrQuality || estimateOcrQuality(doc.text),
  });
  const patternCandidate = buildPatternCandidates(questionDb.questions, job.subjectId);
  const formulaCandidate = buildFormulaCandidates(questionDb.questions, job.subjectId);

  const paths = subjectOutputPaths(job.subjectId);
  for (const p of Object.values(paths)) {
    if (isForbiddenProductPath(p)) {
      throw new Error(`Forbidden product path: ${p}`);
    }
  }

  return {
    subjectId: job.subjectId,
    year: job.year,
    session: job.session,
    paths,
    questionDb,
    patternCandidate,
    formulaCandidate,
    validation: {
      question: validateQuestionDb(questionDb),
      pattern: validatePatternCandidate(patternCandidate),
      formula: validateFormulaCandidate(formulaCandidate),
    },
    answerMatch: {
      matched: matched.matched,
      missing: matched.missing,
      matchRate: matched.matchRate,
    },
    ocrQuality: doc.ocrQuality,
  };
}

/**
 * Run batch import over discovered years + provided text map.
 * @param {{
 *   fileIndex?: Array<{ path: string, bytes?: number }>,
 *   texts?: Record<string, string>,
 *   answerTexts?: Record<string, string>,
 *   answerJson?: Record<string, object>,
 *   yearRange?: { from: number, to: number },
 *   layoutId?: string,
 * }} input
 */
export function runBatchImport(input = {}) {
  const discovery = discoverPastExamYears(input.fileIndex || [], input.yearRange || DEFAULT_YEAR_RANGE);
  const texts = input.texts || {};
  const answerTexts = input.answerTexts || {};
  const answerJson = input.answerJson || {};

  /** @type {Record<string, object>} */
  const bySubject = {};
  const results = [];
  let completed = 0;
  let failed = 0;
  let questionCount = 0;
  let ocrSum = 0;
  let ocrN = 0;
  let totalPdf = 0;

  for (const yearRow of discovery.years) {
    for (const role of ['exam_1', 'exam_2', 'answer']) {
      if (yearRow[role]) totalPdf += 1;
    }

    const answerPath = yearRow.answer?.path;
    const answerMap = mergeAnswerMaps(
      answerPath && answerTexts[answerPath] ? parseAnswerText(answerTexts[answerPath]) : {},
      answerPath && answerJson[answerPath] ? parseAnswerJson(answerJson[answerPath]) : {},
      yearRow.year && answerTexts[String(yearRow.year)]
        ? parseAnswerText(answerTexts[String(yearRow.year)])
        : {},
      yearRow.year && answerJson[String(yearRow.year)]
        ? parseAnswerJson(answerJson[String(yearRow.year)])
        : {},
    );

    for (const session of ['exam_1', 'exam_2']) {
      const slot = yearRow[session];
      if (!slot) continue;
      const text = texts[slot.path] || '';
      try {
        const split = splitExamSession({
          year: yearRow.year,
          session,
          sourcePath: slot.path,
          text,
          layoutId: input.layoutId || 'appraiser-v1',
        });
        for (const job of split.jobs) {
          const out = importSubjectJob(job, answerMap);
          results.push(out);
          completed += 1;
          questionCount += out.questionDb.count;
          ocrSum += out.ocrQuality || 0;
          ocrN += 1;

          if (!bySubject[out.subjectId]) {
            bySubject[out.subjectId] = {
              subjectId: out.subjectId,
              questions: [],
              patterns: null,
              formulas: null,
            };
          }
          bySubject[out.subjectId].questions.push(...out.questionDb.questions);
        }
      } catch (err) {
        failed += 1;
        results.push({
          ok: false,
          year: yearRow.year,
          session,
          error: err?.message || String(err),
        });
      }
    }
  }

  // Merge per-subject candidate DBs
  const outputs = {};
  for (const [subjectId, pack] of Object.entries(bySubject)) {
    const questionDb = buildQuestionDb(pack.questions, {
      subjectId,
      year: null,
      session: null,
      examName: '감정평가사',
    });
    // restore multi-year fields already on each question
    questionDb.questions = pack.questions;
    questionDb.count = pack.questions.length;
    questionDb.geminiReadyCount = pack.questions.filter((q) => q.geminiReady).length;
    const patternCandidate = buildPatternCandidates(pack.questions, subjectId);
    const formulaCandidate = buildFormulaCandidates(pack.questions, subjectId);
    outputs[subjectId] = {
      paths: subjectOutputPaths(subjectId),
      questionDb,
      patternCandidate,
      formulaCandidate,
    };
  }

  const progress = updateImportProgress({
    totalPdf,
    completed,
    failed,
    ocrQualityAvg: ocrN ? Math.round(ocrSum / ocrN) : 0,
    questionCount,
    subjectCount: Object.keys(outputs).length,
  });

  appendImportRun({
    id: `batch-${Date.now()}`,
    discovery: {
      yearCount: discovery.yearCount,
      exam1Count: discovery.exam1Count,
      exam2Count: discovery.exam2Count,
      answerCount: discovery.answerCount,
    },
    progress,
    subjectIds: Object.keys(outputs),
  });

  return {
    ok: failed === 0,
    discovery,
    progress,
    outputs,
    results,
    version: BATCH_IMPORT_VERSION,
  };
}

export default {
  BATCH_IMPORT_VERSION,
  DEFAULT_YEAR_RANGE,
  discoverPastExamYears,
  importSubjectJob,
  runBatchImport,
};
