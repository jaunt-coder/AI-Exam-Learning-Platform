/**
 * Sprint-19B — Universal Import Engine (facade)
 *
 * PDF → OCR/Text → Question Split → Subject Detect → Parse → Answer Match
 * → Question JSON → Pattern Candidate → Formula Candidate → Gemini Ready
 *
 * Never writes data/question-db.json · pattern-db.json · statistics.json
 * Official formula-db.json is never modified (candidates only).
 */

import {
  PDF_LOADER_VERSION,
  classifyExamFile,
  loadDocumentFromText,
  estimateOcrQuality,
} from './pdf-loader.js';
import {
  SUBJECT_DETECT_VERSION,
  APPRAISER_LAYOUT,
  registerExamLayout,
  subjectsForSession,
  detectSubjectsInText,
  splitTextBySubject,
} from './subject-detector.js';
import {
  EXAM_SPLITTER_VERSION,
  splitYearFiles,
  splitExamSession,
} from './exam-splitter.js';
import {
  QUESTION_PARSER_VERSION,
  parseQuestions,
  findQuestionMarkers,
} from './question-parser.js';
import {
  ANSWER_PARSER_VERSION,
  parseAnswerText,
  matchAnswers,
} from './answer-parser.js';
import {
  QUESTION_BUILDER_VERSION,
  buildQuestionDb,
  buildQuestionRecord,
} from './question-builder.js';
import {
  PATTERN_BUILDER_VERSION,
  buildPatternCandidates,
} from './pattern-builder.js';
import {
  FORMULA_CANDIDATE_VERSION,
  buildFormulaCandidates,
} from './formula-builder.js';
import {
  IMPORT_VALIDATOR_VERSION,
  validateQuestionDb,
  isForbiddenProductPath,
} from './import-validator.js';
import {
  IMPORT_STORAGE_VERSION,
  getImportDashboardCard,
  subjectOutputPaths,
  appendImportRun,
  updateImportProgress,
  loadImportCache,
  loadImportHistory,
} from './import-storage.js';
import {
  BATCH_IMPORT_VERSION,
  discoverPastExamYears,
  importSubjectJob,
  runBatchImport,
  DEFAULT_YEAR_RANGE,
} from './batch-import.js';

export const IMPORT_ENGINE_VERSION = '19B';

/**
 * Full pipeline for one session text.
 */
export function importExamText(input = {}) {
  const year = Number(input.year) || null;
  const session = input.session || 'exam_2';
  const doc = loadDocumentFromText({
    text: input.text,
    pages: input.pages,
    sourcePath: input.sourcePath,
    usedOcr: input.usedOcr,
    ocrQuality: input.ocrQuality,
  });
  const split = splitExamSession({
    year,
    session,
    sourcePath: input.sourcePath,
    text: doc.text,
    layoutId: input.layoutId || 'appraiser-v1',
  });
  const answerMap = input.answerMap || parseAnswerText(input.answerText || '');
  const subjectResults = split.jobs.map((job) => importSubjectJob({
    ...job,
    pages: doc.pages,
    usedOcr: doc.usedOcr,
    ocrQuality: doc.ocrQuality,
    examName: input.examName || '감정평가사',
  }, answerMap));

  return {
    year,
    session,
    ocrQuality: doc.ocrQuality,
    subjects: subjectResults,
    subjectIds: subjectResults.map((s) => s.subjectId),
    questionCount: subjectResults.reduce((n, s) => n + (s.questionDb?.count || 0), 0),
    version: IMPORT_ENGINE_VERSION,
  };
}

/**
 * Contract snapshot for data-loader.
 */
export function getImportEngineContractSnapshot() {
  return {
    importEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-19B',
      version: IMPORT_ENGINE_VERSION,
      servicePath: 'js/import-engine/import-engine.js',
      modules: 12,
      universal: true,
      sourceRoot: 'source/past-exams/',
      outputRoot: 'subjects/{subjectId}/',
      productDbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      overrideUnchanged: true,
      runtimeUnchanged: true,
      geminiSolverUnchanged: true,
      visionSolverUnchanged: true,
    },
    questionImportContract: {
      enabled: true,
      schemaVersion: 'v1',
      fields: [
        'questionId', 'subjectId', 'year', 'exam', 'session', 'number',
        'question', 'table', 'choices', 'answer', 'ocrQuality',
        'sourcePdf', 'page', 'hash',
      ],
      servicePath: 'js/import-engine/question-builder.js',
    },
    answerImportContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/import-engine/answer-parser.js',
      matchAnswers: true,
    },
    subjectDetectContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/import-engine/subject-detector.js',
      exam_1: ['civil', 'economics', 'realestate'],
      exam_2: ['law', 'accounting'],
      layoutRegisterable: true,
    },
    validationImportEngine: {
      enabled: true,
      sprint: 'Sprint-19B',
      modules: 12,
      storageKeys: 2,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
  };
}

export {
  IMPORT_ENGINE_VERSION as defaultVersion,
  PDF_LOADER_VERSION,
  SUBJECT_DETECT_VERSION,
  EXAM_SPLITTER_VERSION,
  QUESTION_PARSER_VERSION,
  ANSWER_PARSER_VERSION,
  QUESTION_BUILDER_VERSION,
  PATTERN_BUILDER_VERSION,
  FORMULA_CANDIDATE_VERSION,
  IMPORT_VALIDATOR_VERSION,
  IMPORT_STORAGE_VERSION,
  BATCH_IMPORT_VERSION,
  DEFAULT_YEAR_RANGE,
  APPRAISER_LAYOUT,
  classifyExamFile,
  loadDocumentFromText,
  estimateOcrQuality,
  registerExamLayout,
  subjectsForSession,
  detectSubjectsInText,
  splitTextBySubject,
  splitYearFiles,
  splitExamSession,
  parseQuestions,
  findQuestionMarkers,
  parseAnswerText,
  matchAnswers,
  buildQuestionDb,
  buildQuestionRecord,
  buildPatternCandidates,
  buildFormulaCandidates,
  validateQuestionDb,
  isForbiddenProductPath,
  getImportDashboardCard,
  subjectOutputPaths,
  appendImportRun,
  updateImportProgress,
  loadImportCache,
  loadImportHistory,
  discoverPastExamYears,
  importSubjectJob,
  runBatchImport,
};

export default {
  IMPORT_ENGINE_VERSION,
  importExamText,
  runBatchImport,
  discoverPastExamYears,
  getImportDashboardCard,
  getImportEngineContractSnapshot,
  subjectsForSession,
  subjectOutputPaths,
};
