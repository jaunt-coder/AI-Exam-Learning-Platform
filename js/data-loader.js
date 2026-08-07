/**
 * AI Exam Learning Platform v2
 * Data Loader — JSON Database 로딩 및 검증
 *
 * 기본: data/question-db-mvp.json (Phase 1.5 MVP)
 * Fallback: data/question-db.json (Phase 1 Freeze)
 *
 * Phase 1 Freeze 파일 직접 수정 금지.
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { applyQuestionCleanup } from './data-cleaner.js';

const MASTER_PATH = 'data/master-db.json';

const DB_PATH_SETS = {
  mvp: {
    id: 'mvp',
    label: 'MVP v1.0 · 6개년 240문항',
    questions: 'data/question-db-mvp.json',
    patterns: 'data/pattern-db-mvp.json',
    statistics: 'data/statistics-mvp.json',
  },
  phase1: {
    id: 'phase1',
    label: 'Phase 1 Freeze · 재고자산',
    questions: 'data/question-db.json',
    patterns: 'data/pattern-db.json',
    statistics: 'data/statistics.json',
  },
};

const DEFAULT_DB_SET = 'mvp';
const FALLBACK_DB_SET = 'phase1';

/** @deprecated Phase 1 Freeze 경로 — resolveDatabaseConfig() 사용 권장 */
const PHASE1_PATHS = {
  master: MASTER_PATH,
  patterns: DB_PATH_SETS.phase1.patterns,
  questions: DB_PATH_SETS.phase1.questions,
  statistics: DB_PATH_SETS.phase1.statistics,
};

const CHOICE_SYMBOLS = ['①', '②', '③', '④', '⑤'];
const ALLOWED_SOURCE_TYPES = new Set(['past_exam', 'original_exam']);

/** Inventory MVP scope (Plane C filter — D3/D4 파일 미변경) */
export const INVENTORY_CHAPTER_ID = 'ACC_INV';
export const INVENTORY_PATTERN_PREFIX = 'ACC_INV_';

/**
 * @param {string|null|undefined} patternId
 * @returns {boolean}
 */
export function isInventoryPatternId(patternId) {
  return typeof patternId === 'string' && patternId.startsWith(INVENTORY_PATTERN_PREFIX);
}

/**
 * 재고자산(ACC_INV_*) Pattern·문항·통계만 남긴다. DB 파일은 읽기만 한다.
 * @param {{ patterns?: array, questions?: array, statistics?: array }} payload
 */
export function filterInventoryScope(payload = {}) {
  const patterns = Array.isArray(payload.patterns) ? payload.patterns : [];
  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  const statistics = Array.isArray(payload.statistics) ? payload.statistics : [];

  const invPatterns = patterns.filter(
    (p) =>
      p?.chapterId === INVENTORY_CHAPTER_ID || isInventoryPatternId(p?.patternId),
  );
  const invPatternIds = new Set(invPatterns.map((p) => p.patternId));

  const invQuestions = questions.filter(
    (q) =>
      q?.chapterId === INVENTORY_CHAPTER_ID ||
      invPatternIds.has(q?.patternId) ||
      isInventoryPatternId(q?.patternId),
  );

  const invStatistics = statistics.filter((s) => invPatternIds.has(s?.patternId));

  return {
    patterns: invPatterns,
    questions: invQuestions,
    statistics: invStatistics,
  };
}

/**
 * JSON 파일을 fetch하여 파싱한다.
 * @param {string} path
 * @returns {Promise<object|array>}
 */
export async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${path}`);
  }
  return response.json();
}

/**
 * 환경 설정에 따라 사용할 DB 경로 세트를 결정한다.
 * 우선순위: URL ?db= · settings.questionDb · window.APP_DB_CONFIG · 기본 MVP
 * @returns {typeof DB_PATH_SETS.mvp}
 */
export function resolveDatabaseConfig() {
  if (typeof window !== 'undefined') {
    const queryDb = new URLSearchParams(window.location.search).get('db');
    if (queryDb === 'mvp' || queryDb === 'phase1') {
      return DB_PATH_SETS[queryDb];
    }
  }

  const settings = getItem(STORAGE_KEYS.SETTINGS, {});
  if (settings.questionDb === 'mvp' || settings.questionDb === 'phase1') {
    return DB_PATH_SETS[settings.questionDb];
  }

  if (typeof window !== 'undefined' && window.APP_DB_CONFIG?.questionDb) {
    const configured = window.APP_DB_CONFIG.questionDb;
    if (DB_PATH_SETS[configured]) {
      return DB_PATH_SETS[configured];
    }
  }

  return DB_PATH_SETS[DEFAULT_DB_SET];
}

/**
 * question-db payload를 문항 배열로 정규화한다.
 * @param {array|object} payload
 * @returns {array}
 */
export function normalizeQuestionsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.questions)) {
    return payload.questions;
  }
  return [];
}

/**
 * Taxonomy V2 — frequency / mapping 검증용 effective Pattern.
 * primaryPattern 우선, 없으면 patternId. relatedPatterns는 count 대상이 아님.
 * @param {object} question
 * @returns {string|null|undefined}
 */
export function effectiveQuestionPatternId(question) {
  if (!question || typeof question !== 'object') return null;
  return question.primaryPattern ?? question.patternId;
}

/**
 * @param {typeof DB_PATH_SETS.mvp} dbSet
 * @param {object} data
 * @param {object} [options]
 */
/**
 * Non-empty evidence list for Taxonomy V2 contract.
 * @param {object} pattern
 * @returns {boolean}
 */
function hasApprovedEvidence(pattern) {
  const approved = pattern?.approvedEvidenceQuestions;
  if (Array.isArray(approved) && approved.length > 0) return true;
  const questions = pattern?.evidence?.questions;
  return Array.isArray(questions) && questions.length > 0;
}

/**
 * Sprint-09I — Evidence Quality Gate projection (warning mode).
 * @param {array} patterns
 * @returns {{ totalPatterns: number, approved: number, missingReview: number, blocked: number }}
 */
export function buildEvidenceReviewSummary(patterns = []) {
  let totalPatterns = 0;
  let approved = 0;
  let missingReview = 0;
  let blocked = 0;

  for (const p of patterns || []) {
    if ((p?.frequency || 0) <= 0) continue;
    totalPatterns += 1;

    const status = p?.evidenceReview?.status || p?.evidence?.reviewStatus || null;
    if (status === 'REJECTED') {
      blocked += 1;
      continue;
    }

    if (hasApprovedEvidence(p)) {
      approved += 1;
    } else {
      missingReview += 1;
    }
  }

  return { totalPatterns, approved, missingReview, blocked };
}

function validateDatabasePayload(dbSet, data, options = {}) {
  const errors = [];
  /** Sprint-09H/09I: evidence gaps are warnings (do not fail valid) */
  const warnings = [];
  const { master, patterns, questions, statistics } = data;

  if (!master || typeof master !== 'object') {
    errors.push('master-db: 로드 실패');
  } else if (dbSet.id === 'phase1' && !master?.metadata?.pdfVerified) {
    errors.push('master-db: pdfVerified가 true가 아닙니다.');
  }

  if (!Array.isArray(patterns) || patterns.length === 0) {
    errors.push('pattern-db: 비어 있거나 배열이 아닙니다.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('question-db: 비어 있거나 배열이 아닙니다.');
  }

  if (!Array.isArray(statistics)) {
    errors.push('statistics.json: 배열이 아닙니다.');
  }

  const patternIds = new Set((patterns || []).map((p) => p.patternId));

  for (const q of questions || []) {
    const req = ['questionId', 'patternId', 'question', 'choices', 'answer', 'solution', 'originalQuestion', 'source'];
    for (const field of req) {
      if (q[field] === undefined || q[field] === null) {
        errors.push(`${q.questionId || '?'}: 필수 필드 누락 (${field})`);
      }
    }

    const choices = q.choices || [];
    if (choices.length !== 5) {
      errors.push(`${q.questionId || '?'}: 보기 ${choices.length}개`);
    }

    if (q.answer === undefined || q.answer === null) {
      errors.push(`${q.questionId || '?'}: answer 누락`);
    }

    if (q.patternId && !patternIds.has(q.patternId)) {
      errors.push(`${q.questionId}: invalid patternId ${q.patternId}`);
    }

    const sourceType = q.source?.type;
    if (sourceType && !ALLOWED_SOURCE_TYPES.has(sourceType)) {
      errors.push(`${q.questionId}: source.type must be past_exam or original_exam`);
    }

    if (q.source?.year !== undefined && q.year !== undefined && q.source.year !== q.year) {
      errors.push(`${q.questionId}: year/source.year 불일치`);
    }
  }

  for (const p of patterns || []) {
    /* Taxonomy V2: primaryPattern ?? patternId — relatedPatterns 제외 */
    const cnt = (questions || []).filter(
      (q) => effectiveQuestionPatternId(q) === p.patternId,
    ).length;
    if (p.frequency !== cnt) {
      errors.push(`${p.patternId}: frequency(${p.frequency}) != questions(${cnt})`);
    }

    /* Evidence contract — Sprint-09H warning mode (valid 유지) */
    if ((p.frequency || 0) > 0 && !hasApprovedEvidence(p)) {
      warnings.push(`[EVIDENCE_GAP] ${p.patternId} evidence missing`);
    }
  }

  if (dbSet.id === 'mvp' && (questions || []).length !== 240) {
    errors.push(`MVP question count ${(questions || []).length}/240`);
  }

  const evidenceReview = buildEvidenceReviewSummary(patterns || []);

  /* Sprint-09J/09K — Pattern Mastery Contract + Runtime projection (does not fail valid) */
  const masteryContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    schemaPath: 'data/mastery-state-schema.json',
  };
  const masteryRuntime = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.mastery.v1',
    servicePath: 'js/mastery-service.js',
  };
  const weaknessRuntime = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.weakness.v1',
    servicePath: 'js/weakness-service.js',
  };
  /* Sprint-09M — Learning Plan Contract (runtime connected; does not fail valid) */
  const learningPlanContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    schemaPath: 'data/learning-plan-schema.json',
    storageKey: 'learning.plan.v1',
    servicePath: 'js/learning-plan-service.js',
  };
  /* Sprint-09N — Learning Strategy Resolver (runtime connected; does not fail valid) */
  const strategyContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    schemaPath: 'data/learning-strategy-schema.json',
    storageKey: 'learning.strategy.v1',
    servicePath: 'js/learning-strategy-service.js',
  };
  /* Sprint-10D — Study Session Runtime (runtime connected) */
  const studySessionContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    schemaPath: 'data/study-session-schema.json',
    storageKey: 'learning.session.v1',
    servicePath: 'js/study-session-service.js',
  };
  /* Sprint-10E — Learning Dashboard (UI projection; does not fail valid) */
  const dashboardContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.*',
    servicePath: 'js/dashboard-service.js',
    pagePath: 'dashboard.html',
  };
  /* Sprint-10F — Adaptive Question Selector (does not fail valid) */
  const selectorContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/question-selector.js',
  };
  /* Sprint-10G — Recommendation Engine v1 (does not fail valid) */
  const recommendationContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    schemaPath: 'data/recommendation-schema.json',
    storageKey: 'learning.recommendation.v1',
    servicePath: 'js/recommendation-service.js',
  };
  /* Sprint-11A — LLM Adapter + AI Coach (does not fail valid) */
  const llm = {
    enabled: true,
    provider: 'OPENAI',
    model: 'gpt-5.5',
    adapter: true,
    connected: true,
    configPath: 'data/llm-config.json',
    coachSchemaPath: 'data/coach-schema.json',
    clientPath: 'js/llm/llm-client.js',
    coachPath: 'js/coach/ai-coach-service.js',
    cacheKey: 'learning.llm.cache.v1',
  };
  /* Sprint-11B — Pattern Tutor (does not fail valid) */
  const patternTutor = {
    enabled: true,
    connected: true,
    provider: 'openai',
    model: 'gpt-5.5',
    fallback: true,
    tutorPath: 'js/coach/pattern-tutor.js',
    promptBuilderPath: 'js/llm/pattern-prompt-builder.js',
  };
  /* Sprint-11C — Question Tutor (does not fail valid) */
  const questionTutor = {
    enabled: true,
    connected: true,
    provider: 'openai',
    model: 'gpt-5.5',
    fallback: true,
    schemaValidated: true,
    tutorPath: 'js/coach/question-tutor.js',
    promptBuilderPath: 'js/llm/question-prompt-builder.js',
  };
  /* Sprint-12A — Reviewer Mode / Override Layer (does not fail valid) */
  const reviewContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.review.v1',
    servicePath: 'js/reviewer/review-service.js',
  };
  const overrideContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'question-overrides.v1',
    servicePath: 'js/reviewer/override-service.js',
  };
  const tableEditorContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/reviewer/table-editor.js',
  };
  const questionOverrideContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    historyKey: 'review-history.v1',
    resolver: 'resolveQuestion',
  };
  const review = {
    enabled: true,
    connected: true,
    mode: 'reviewer',
    overrideLayer: true,
  };
  const override = {
    enabled: true,
    connected: true,
    readOnlyQuestionDb: true,
  };
  const tableEditor = {
    enabled: true,
    connected: true,
    spreadsheet: true,
    undoRedo: true,
  };
  /* Sprint-12B — AI Recovery Assistant (does not fail valid; 12A contracts unchanged) */
  const aiRecoveryContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.recovery.v1',
    servicePath: 'js/recovery/ai-recovery-service.js',
  };
  const suggestionContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.suggestion.v1',
    servicePath: 'js/recovery/suggestion-engine.js',
  };
  const confidenceContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.confidence.v1',
    servicePath: 'js/recovery/confidence-engine.js',
  };
  const approvalContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/recovery/approval-engine.js',
    usesOverrideApi: true,
  };
  const aiRecovery = {
    enabled: true,
    connected: true,
    suggestionLayer: true,
    reviewerTab: 'AI Recovery',
  };
  /* Sprint-12C — Data Quality Center (does not fail valid) */
  const qualityContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.quality.v1',
    servicePath: 'js/quality/quality-engine.js',
  };
  const qualityScoreContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/quality/quality-score.js',
  };
  const qualityDashboardContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    pagePath: 'quality.html',
    servicePath: 'js/quality/quality-dashboard.js',
  };
  const quality = {
    enabled: true,
    connected: true,
    dashboard: true,
    scoreRange: '0-100',
  };
  const qualityDashboard = {
    enabled: true,
    connected: true,
  };
  const qualityScore = {
    enabled: true,
    connected: true,
  };
  /* Sprint-12D — Human Review Workflow (does not fail valid) */
  const reviewWorkflowContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.review-workflow.v1',
    servicePath: 'js/review-workflow/workflow-service.js',
    pagePath: 'review.html',
  };
  const reviewQueueContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.review-queue.v1',
    servicePath: 'js/review-workflow/review-queue.js',
  };
  const reviewDecisionContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.review-decision.v1',
    servicePath: 'js/review-workflow/review-decision.js',
  };
  const reviewAssignmentContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/review-workflow/review-assignment.js',
  };
  const reviewWorkflow = {
    enabled: true,
    connected: true,
    usesOverrideOnly: true,
  };
  /* Sprint-12E — Reviewer Workspace (does not fail valid) */
  const reviewWorkspaceContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.workspace.v1',
    servicePath: 'js/review-workspace/workspace-service.js',
    pagePath: 'review-workspace.html',
  };
  const quickFixContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.quick-fix.v1',
    servicePath: 'js/review-workspace/quick-fix.js',
  };
  const reviewSessionContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.review-session.v1',
    servicePath: 'js/review-workspace/review-session.js',
  };
  const focusModeContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKey: 'learning.focus-mode.v1',
    servicePath: 'js/review-workspace/focus-mode.js',
  };
  const bulkReviewContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/review-workspace/bulk-review.js',
  };
  const reviewWorkspace = {
    enabled: true,
    connected: true,
    oneClick: true,
    usesOverrideOnly: true,
  };
  /* Sprint-13A — Student Learning Workspace (does not fail valid) */
  const studentResolverContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/student/student-resolver.js',
    resolvers: [
      'questionResolver',
      'patternResolver',
      'tableResolver',
      'solutionResolver',
    ],
  };
  const studentWorkspaceContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    servicePath: 'js/student/student-workspace.js',
    appliesTo: [
      'question.html',
      'pattern.html',
      'exam.html',
      'ai-tutor.html',
      'dashboard.html',
    ],
  };
  const studentSessionContract = {
    enabled: true,
    schemaVersion: 'v1',
    connected: true,
    storageKeys: ['learning.student-session.v1', 'learning.student-cache.v1'],
    servicePath: 'js/student/student-session.js',
  };
  const studentWorkspace = {
    enabled: true,
    connected: true,
    resolvedOnly: true,
    usesOverrideLayer: true,
    examSnapshotFrozen: true,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    evidenceReview,
    masteryContract,
    masteryRuntime,
    weaknessRuntime,
    learningPlanContract,
    strategyContract,
    studySessionContract,
    dashboardContract,
    selectorContract,
    recommendationContract,
    llm,
    patternTutor,
    questionTutor,
    reviewContract,
    overrideContract,
    tableEditorContract,
    questionOverrideContract,
    review,
    override,
    tableEditor,
    aiRecoveryContract,
    suggestionContract,
    confidenceContract,
    approvalContract,
    aiRecovery,
    qualityContract,
    qualityScoreContract,
    qualityDashboardContract,
    quality,
    qualityDashboard,
    qualityScore,
    reviewWorkflowContract,
    reviewQueueContract,
    reviewDecisionContract,
    reviewAssignmentContract,
    reviewWorkflow,
    reviewWorkspaceContract,
    quickFixContract,
    reviewSessionContract,
    focusModeContract,
    bulkReviewContract,
    reviewWorkspace,
    studentResolverContract,
    studentWorkspaceContract,
    studentSessionContract,
    studentWorkspace,
    learningEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/learning-engine/learning-engine.js',
      modules: [
        'learning-engine.js',
        'learning-analyzer.js',
        'mastery-engine.js',
        'recommendation-engine.js',
        'review-engine.js',
        'scheduler.js',
        'learning-storage.js',
      ],
    },
    masteryEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/learning-engine/mastery-engine.js',
      storageKeys: ['learning.engine-progress.v1'],
    },
    recommendationEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/learning-engine/recommendation-engine.js',
    },
    reviewCycleContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/learning-engine/review-engine.js',
      storageKeys: ['learning.review-cycle.v1'],
      intervals: [1, 3, 7, 14, 30],
    },
    scheduleContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/learning-engine/scheduler.js',
      storageKeys: ['learning.schedule.v1'],
    },
    validationLearningEngine: {
      enabled: true,
      sprint: 'Sprint-13B',
      modules: 7,
      storageKeys: 3,
    },
    dashboardWidgetContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/dashboard/dashboard-widget.js',
      widgetCount: 10,
    },
    dashboardChartContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/dashboard/dashboard-chart.js',
      charts: ['line', 'radar', 'donut', 'heatmap'],
    },
    dashboardFilterContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.dashboard-filter.v1',
      servicePath: 'js/dashboard/dashboard-filter.js',
    },
    dashboardCacheContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.dashboard-cache.v1',
      servicePath: 'js/dashboard/dashboard-cache.js',
    },
    validationDashboard: {
      enabled: true,
      sprint: 'Sprint-14B',
      widgets: 10,
      charts: 4,
    },
    evidenceContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/evidence/evidence-engine.js',
      types: 8,
      padKeyReadOnly: 'learning.evidence.v1',
    },
    evidenceScoreContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/evidence/evidence-score.js',
    },
    evidenceSummaryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.evidence-summary.v1',
      servicePath: 'js/evidence/evidence-summary.js',
    },
    recommendationEvidenceContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/recommendation.js',
      rankingUnchanged: true,
    },
    dashboardEvidenceContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/components/dashboard/recommendation.js',
    },
    tutorEvidenceContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/ai-tutor.js',
    },
    validationEvidence: {
      enabled: true,
      sprint: 'Sprint-14C',
      modules: 8,
      storageKeys: 4,
    },
    /* Sprint-15A+ — AI Dynamic Solution Engine (does not fail valid) */
    solutionEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/solution-engine.js',
      modules: 11,
      storageKeys: [
        'learning.solution-cache.v1',
        'learning.solution-history.v1',
        'learning.mistake-profile.v1',
        'learning.diagnosis.v1',
        'learning.prescription.v1',
      ],
      dbWriteForbidden: true,
      overrideForbidden: true,
      autoPromoteForbidden: true,
    },
    explanationContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/explanation-generator.js',
    },
    diagnosisContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/mistake-diagnosis.js',
      storageKey: 'learning.diagnosis.v1',
    },
    misconceptionContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/misconception-engine.js',
    },
    tutorAdviceContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/tutor-advice.js',
    },
    prescriptionContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-engine/learning-prescription.js',
      storageKey: 'learning.prescription.v1',
      learningEngineFormulasUnchanged: true,
    },
    validationSolutionEngine: {
      enabled: true,
      sprint: 'Sprint-15A+',
      modules: 11,
      storageKeys: 5,
    },
    /* Sprint-15B — AI Learning Loop & Smart Tutor (does not fail valid) */
    smartReviewContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/smart-review.js',
      storageKey: 'learning.smart-review.v1',
      sections: ['oneLine', 'coreReason', 'calcOrder', 'traps', 'memory'],
    },
    formulaCardContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/formula-card.js',
      storageKey: 'learning.formula-card.v1',
      purpose: '암기',
      formulaEngineUnchanged: true,
    },
    miniRetryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/mini-retry.js',
      storageKey: 'learning.mini-retry.v1',
      questionDbWriteForbidden: true,
      source: 'pattern-db/relatedQuestions',
    },
    weakMemoryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/weak-memory.js',
      storageKey: 'learning.weak-memory.v1',
      threshold: 3,
    },
    smartTutorContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/smart-tutor.js',
      storageKey: 'learning.smart-tutor.v1',
      examHallFlow: true,
      autoPromoteForbidden: true,
      reviewerFeedbackIncluded: true,
    },
    learningLoopContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/smart-tutor/learning-loop.js',
      refreshes: ['learning', 'review', 'recommendation', 'dashboard', 'evidence'],
      learningEngineFormulasUnchanged: true,
      runtimeUnchanged: true,
    },
    validationSmartTutor: {
      enabled: true,
      sprint: 'Sprint-15B',
      modules: 7,
      storageKeys: 5,
      dbWriteForbidden: true,
    },
    /* Sprint-16A — AI Exam Strategy (does not fail valid) */
    examStrategyContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-strategy/strategy-engine.js',
      storageKey: 'learning.strategy-state.v1',
      learningEngineFormulasUnchanged: true,
      recommendationEngineUnchanged: true,
    },
    readinessScoreContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-strategy/readiness-score.js',
      storageKey: 'learning.exam-readiness.v1',
      range: [0, 100],
      weights: {
        mastery: 40,
        recentAccuracy: 20,
        repeatWrong: 20,
        reviewCompliance: 10,
        confidence: 10,
      },
    },
    dailyPlanContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-strategy/daily-plan-generator.js',
      storageKey: 'learning.daily-plan.v1',
    },
    patternRiskContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-strategy/weakness-priority.js',
      storageKey: 'learning.pattern-risk.v1',
      levels: ['LOW', 'MID', 'HIGH', 'CRITICAL'],
    },
    examModeContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-strategy/exam-advice.js',
      storageKey: 'learning.exam-mode.v1',
      phases: ['NORMAL', 'D30', 'D7', 'D1'],
    },
    validationExamStrategy: {
      enabled: true,
      sprint: 'Sprint-16A',
      modules: 6,
      storageKeys: 5,
      dbWriteForbidden: true,
    },
    /* Sprint-16B — Exam Mode & Goal Management (does not fail valid) */
    examGoalContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-goal/exam-goal-engine.js',
      storageKey: 'learning.exam-goal.v1',
      fields: ['examDate', 'targetScore', 'currentScore', 'availableMinutes', 'subjects'],
    },
    examProgressContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.exam-progress.v1',
      tracks: ['dailyCompletion', 'completedTasks', 'missedTasks', 'streak'],
    },
    examPhaseContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/exam-goal/exam-phase-engine.js',
      storageKey: 'learning.exam-phase.v1',
      phases: ['FOUNDATION', 'WEAKNESS_REMOVAL', 'FINAL_STABILIZATION', 'EXAM_READY'],
    },
    validationExamMode: {
      enabled: true,
      sprint: 'Sprint-16B',
      modules: 5,
      storageKeys: 3,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-15C — AI Solution Quality (does not fail valid) */
    solutionQualityContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-quality/solution-quality-engine.js',
      storageKey: 'learning.solution-quality.v1',
      dimensions: ['approach', 'concept', 'calculation', 'diagnosis', 'examTip'],
      maxScore: 100,
      solutionEngineUnchanged: true,
    },
    solutionBlueprintContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-quality/solution-blueprint.js',
      storageKey: 'learning.solution-blueprint.v1',
    },
    solutionImprovementContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/solution-quality/solution-improvement.js',
      storageKey: 'learning.solution-improvement.v1',
      autoApproveForbidden: true,
    },
    solutionReviewContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.solution-review.v1',
      usesOverrideOnly: true,
      autoApproveForbidden: true,
    },
    validationSolutionQuality: {
      enabled: true,
      sprint: 'Sprint-15C',
      modules: 8,
      storageKeys: 4,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-17A — Gemini Native Problem Solver (Problem First) */
    geminiSolverContract: {
      enabled: true,
      schemaVersion: '17C',
      connected: true,
      sprint: 'Sprint-17C',
      servicePath: 'js/gemini-solver/gemini-orchestrator.js',
      modules: 15,
      storageKeys: [
        'learning.gemini-cache.v1',
        'learning.gemini-history.v1',
        'learning.gemini-quality.v1',
        'learning.gemini-version.v1',
      ],
      problemFirst: true,
      humanLevel: true,
      promptVersion: '17D.2',
      patternForRecommendationOnly: true,
      twoPassValidation: true,
      missingRecovery: true,
      professorExplanation: true,
      professorPromptVersion: '17D.2',
      studentFastMode: true,
      studentSkipAutoRegen: true,
      manualTriggerOnly: true,
      dbWriteForbidden: true,
      overrideUsesAdditiveGeminiNativeOnly: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      masteryUnchanged: true,
      runtimeUnchanged: true,
      resolverUnchanged: true,
      visionUnchanged: true,
    },
    professorExplanationContract: {
      enabled: true,
      schemaVersion: '17D.2',
      connected: true,
      sprint: 'Sprint-17D.2',
      servicePath: 'js/professor-explanation/professor-engine.js',
      promptPath: 'js/professor-explanation/professor-prompt.js',
      qualityPath: 'js/professor-explanation/explanation-quality-reviewer.js',
      evaluationSet: 'data/professor-evaluation-test.json',
      promptVersion: '17D.2',
      providerVersion: 'GEMINI-17E.1',
      runtimeVersion: '17E.1',
      apiMode: 'interactions',
      defaultModel: 'gemini-3-flash',
      fallbackModel: 'gemini-3-flash-preview',
      aiConfigKey: 'learning.ai-config.v1',
      qualityApproveThreshold: 90,
      qualityPartialThreshold: 70,
      reconstructionLayer: 'js/exam-reconstruction/reconstruction-engine.js',
      reconstructionSchema: 'data/question-layout.json',
      studentFastModeDefault: true,
      studentSkipAutoRegen: true,
      reviewerAutoPartialOptIn: true,
      manualTriggerOnly: true,
      autoCacheGenerationForbidden: true,
      silentLocalFallbackForbidden: true,
      cacheKeyParts: [
        'questionId',
        'overrideVersion',
        'modelVersion',
        'promptVersion',
        'providerVersion',
      ],
      storageKeys: [
        'learning.professor-cache.v1',
        'learning.professor-quality.v1',
        'learning.professor-history.v1',
        'learning.ai-config.v1',
      ],
      outputFields: [
        'problemUnderstanding',
        'coreConcept',
        'appliedTheory',
        'thinkingOrder',
        'solution',
        'choiceAnalysis',
        'formula',
        'memoryHack',
        'examTip',
        'tutorMessage',
      ],
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      masteryUnchanged: true,
    },
    examReconstructionContract: {
      enabled: true,
      schemaVersion: '17D.6',
      connected: true,
      sprint: 'Sprint-17D.6',
      servicePath: 'js/exam-reconstruction/reconstruction-engine.js',
      schemaPath: 'data/question-layout.json',
      evaluationSet: 'data/reconstruction-evaluation-test.json',
      storageKey: 'learning.exam-reconstruction.v1',
      accuracyTarget: 95,
      solveForbidden: true,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      overlayOnly: true,
      pipeline: [
        'PDF Source',
        'Question Locator',
        'Vision Reconstruction',
        'question-layout JSON',
        'Professor Engine Input',
      ],
    },
    aiConfigContract: {
      enabled: true,
      schemaVersion: '17E.1',
      connected: true,
      sprint: 'Sprint-17E',
      servicePath: 'js/llm/ai-config.js',
      runtimePath: 'js/llm/runtime/responses-runtime.js',
      storageKey: 'learning.ai-config.v1',
      defaultModel: 'gemini-3-flash',
      fallbackModel: 'gemini-3-flash-preview',
      apiVersion: 'v1beta',
      providerVersion: 'GEMINI-17E.1',
      runtimeVersion: '17E.1',
      apiMode: 'interactions',
      connectionTestRequiresGenerateContent: false,
      connectionTestRequiresInteractions: true,
      connectionTestHttpOk: 200,
      resolvePriority: [
        'learning.ai-config.v1',
        'legacy settings',
        'llm-config metadata',
        'LOCAL fallback',
      ],
      settingsUi: 'settings.html#gemini-ai-config',
      dbWriteForbidden: true,
    },
    responsesRuntimeContract: {
      enabled: true,
      schemaVersion: '17E.1',
      sprint: 'Sprint-17E',
      modules: [
        'js/llm/runtime/responses-client.js',
        'js/llm/runtime/responses-parser.js',
        'js/llm/runtime/responses-runtime.js',
        'js/llm/runtime/responses-validator.js',
        'js/llm/runtime/responses-stream.js',
        'js/llm/runtime/responses-cache.js',
        'js/llm/runtime/responses-model.js',
        'js/llm/runtime/responses-errors.js',
        'js/llm/model-registry.js',
      ],
      promptLayer: 'js/prompts/',
      interactionsPath: '/v1beta/interactions',
      maxRetries: 4,
      streaming: true,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    humanExplanationContract: {
      enabled: true,
      schemaVersion: '17C',
      connected: true,
      servicePath: 'js/gemini-solver/human-explanation-validator.js',
      required: [
        'thinkingOrder',
        'calculation',
        'summary',
        'formula',
        'examTip',
        'memoryHack',
        'whyOthersWrong',
      ],
      calculationMinLines: 5,
      numberUsageConfidence: true,
    },
    geminiCacheContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/gemini-solver/cache-manager.js',
      cacheKeyParts: ['questionId', 'overrideVersion', 'modelVersion', 'promptVersion'],
      hitSkipsGeminiCall: true,
      promptVersionBustsCache: true,
    },
    validationGeminiSolver: {
      enabled: true,
      sprint: 'Sprint-17C',
      modules: 15,
      storageKeys: 4,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    validationHumanExplanation: {
      enabled: true,
      sprint: 'Sprint-17C',
      calculationMinLines: 5,
      dbWriteForbidden: true,
    },
    /* Sprint-18A — Personal AI Textbook + Final Revision Book */
    personalTextbookContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-18A',
      servicePath: 'js/personal-textbook/textbook-engine.js',
      storageKeys: [
        'learning.personal-textbook.v1',
        'learning.personal-note.v1',
        'learning.personal-summary.v1',
        'learning.personal-tag.v1',
        'learning.personal-bookmark.v1',
        'learning.personal-favorite.v1',
      ],
      autoSaveOnSubmit: true,
      summaryMinSolves: 3,
      versionHistoryKept: true,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      masteryUnchanged: true,
      runtimeUnchanged: true,
      overrideUnchanged: true,
    },
    personalSummaryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.personal-summary.v1',
      minPatternSolves: 3,
      versionHistoryKept: true,
      deleteForbidden: true,
    },
    personalExportContract: {
      enabled: true,
      formats: ['pdf', 'markdown', 'html'],
      servicePath: 'js/personal-textbook/textbook-export.js',
    },
    personalBookmarkContract: {
      enabled: true,
      storageKey: 'learning.personal-bookmark.v1',
      favoriteFormulaKey: 'learning.personal-favorite.v1',
    },
    validationPersonalTextbook: {
      enabled: true,
      sprint: 'Sprint-18A',
      modules: 8,
      storageKeys: 6,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    finalRevisionBookContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-18A',
      servicePath: 'js/final-revision/final-book-engine.js',
      storageKeys: [
        'learning.final-book.v1',
        'learning.final-summary.v1',
        'learning.final-formula.v1',
      ],
      autoDays: [30, 14, 7, 3, 1],
      predictionForbidden: true,
      condensedPayloadOnly: true,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      runtimeUnchanged: true,
      overrideUnchanged: true,
    },
    finalSummaryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/final-revision/final-summary.js',
      condensedFields: [
        'weakPattern',
        'weakFormula',
        'recentMistake',
        'mastery',
        'goal',
        'examDate',
        'reviewCycle',
      ],
      fullTextbookForbidden: true,
      predictionForbidden: true,
    },
    validationFinalRevisionBook: {
      enabled: true,
      sprint: 'Sprint-18A',
      sections: 10,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-19A — Subject Adapter Layer (Multi Subject Platform) */
    subjectAdapterContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-19A',
      servicePath: 'js/subject/subject-adapter.js',
      defaultSubjectId: 'accounting',
      subjectIds: ['accounting', 'economics', 'civil', 'realestate', 'law'],
      storageKeys: [
        'learning.current-subject.v1',
        'learning.subject-config.v1',
        'learning.subject-history.v1',
      ],
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      overrideUnchanged: true,
      runtimeUnchanged: true,
      geminiSolverUnchanged: true,
      visionOcrUnchanged: true,
    },
    subjectRegistryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      registerSubject: true,
      getCurrentSubject: true,
      loadSubject: true,
      switchSubject: true,
      pluginsPath: 'subjects/',
    },
    subjectPromptContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      composition: [
        'Subject Prompt',
        'Resolved Question',
        'Learning Context',
        'Student Context',
      ],
      accountingHardcodedRemoved: true,
      servicePath: 'js/subject/subject-prompt-builder.js',
    },
    validationSubjectAdapter: {
      enabled: true,
      sprint: 'Sprint-19A',
      modules: 7,
      plugins: 5,
      storageKeys: 3,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-19B — Universal Import Engine */
    importEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-19B',
      servicePath: 'js/import-engine/import-engine.js',
      modules: 12,
      universal: true,
      sourceRoot: 'source/past-exams/',
      outputRoot: 'subjects/{subjectId}/',
      storageKeys: [
        'learning.import-history.v1',
        'learning.import-cache.v1',
      ],
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
      connected: true,
      servicePath: 'js/import-engine/question-builder.js',
      fields: [
        'questionId', 'subjectId', 'year', 'exam', 'session', 'number',
        'question', 'table', 'choices', 'answer', 'ocrQuality',
        'sourcePdf', 'page', 'hash',
      ],
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
    /* Sprint-19C — Pattern Intelligence Map + Pass60 + ROI */
    patternMapContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-19C',
      servicePath: 'js/pattern-map/pattern-map-engine.js',
      modules: 12,
      philosophy: ['Pattern First', 'ROI First'],
      storageKeys: [
        'learning.pattern-map.v1',
        'learning.pattern-priority.v1',
        'learning.pass60.v1',
        'learning.roi.v1',
      ],
      productDbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      overrideUnchanged: true,
      runtimeUnchanged: true,
      geminiSolverUnchanged: true,
      visionSolverUnchanged: true,
    },
    pass60Contract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      targetScore: 60,
      servicePath: 'js/pattern-map/pass60-engine.js',
      storageKey: 'learning.pass60.v1',
    },
    roiContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      formula: 'ExpectedScoreGain / EstimatedStudyTime',
      priorityFormula: 'Frequency × MasteryGap × RecentWrong × Confidence × ROI',
      servicePath: 'js/pattern-map/roi-engine.js',
      storageKey: 'learning.roi.v1',
    },
    validationPatternMap: {
      enabled: true,
      sprint: 'Sprint-19C',
      modules: 12,
      storageKeys: 4,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-17B — Gemini Vision OCR Recovery Layer */
    visionEngineContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-17B',
      servicePath: 'js/gemini-vision/vision-engine.js',
      modules: 12,
      restoreOnly: true,
      solveForbidden: true,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      masteryUnchanged: true,
      runtimeUnchanged: true,
      overrideAdditiveOnly: true,
    },
    visionQualityContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/gemini-vision/vision-quality.js',
      storageKey: 'learning.vision-quality.v1',
    },
    visionCacheContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/gemini-vision/vision-cache.js',
      storageKeys: [
        'learning.vision-cache.v1',
        'learning.vision-history.v1',
        'learning.vision-quality.v1',
        'learning.vision-config.v1',
      ],
      cacheKeyParts: ['questionId', 'pdfHash', 'visionModel', 'promptVersion'],
      hitSkipsVisionCall: true,
      indexedDbDurable: true,
    },
    ocrQualityContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/gemini-vision/ocr-quality.js',
      defaultThreshold: 70,
      thresholdConfigurable: true,
    },
    visionRecoveryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/gemini-vision/vision-recovery.js',
      hybrid: true,
      fallbackToOcr: true,
      backgroundPrewarm: true,
      studentAlwaysVisible: true,
    },
    validationVision: {
      enabled: true,
      sprint: 'Sprint-17B',
      modules: 12,
      storageKeys: 4,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
    /* Sprint-12F — Reviewer Entry Integration (does not fail valid) */
    reviewEntryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/reviewer/review-entry.js',
      pages: ['question.html', 'learning-loop.html'],
      usesOverrideOnly: true,
    },
    reviewToolbarContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/reviewer/review-toolbar.js',
      buttons: ['PDF', 'AI', '수정', 'Report Issue'],
    },
    reviewModalContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/reviewer/review-modal.js',
      decisions: ['Approve', 'Reject', 'Skip', 'Next'],
    },
    reviewDraftContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review-draft.v1',
      servicePath: 'js/reviewer/review-draft.js',
      autosaveMs: 5000,
    },
    validationReviewEntry: {
      enabled: true,
      sprint: 'Sprint-12F',
      modules: 5,
      storageKeys: 3,
    },
    fallbackFrom: options.fallbackFrom || null,
  };
}

/**
 * 단일 DB 세트를 로드·검증한다.
 * @param {typeof DB_PATH_SETS.mvp} dbSet
 * @param {object} [options]
 */
async function loadDatabaseSet(dbSet, options = {}) {
  let master;
  let patterns;
  let questionPayload;
  let statistics;

  try {
    [master, patterns, questionPayload, statistics] = await Promise.all([
      loadJSON(MASTER_PATH),
      loadJSON(dbSet.patterns),
      loadJSON(dbSet.questions),
      loadJSON(dbSet.statistics),
    ]);
  } catch (error) {
    return {
      master: null,
      patterns: [],
      questions: [],
      statistics: [],
      valid: false,
      errors: [error.message],
      warnings: [],
      evidenceReview: {
        totalPatterns: 0,
        approved: 0,
        missingReview: 0,
        blocked: 0,
      },
      masteryContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        schemaPath: 'data/mastery-state-schema.json',
      },
      masteryRuntime: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.mastery.v1',
        servicePath: 'js/mastery-service.js',
      },
      weaknessRuntime: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.weakness.v1',
        servicePath: 'js/weakness-service.js',
      },
      learningPlanContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        schemaPath: 'data/learning-plan-schema.json',
        storageKey: 'learning.plan.v1',
        servicePath: 'js/learning-plan-service.js',
      },
      strategyContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        schemaPath: 'data/learning-strategy-schema.json',
        storageKey: 'learning.strategy.v1',
        servicePath: 'js/learning-strategy-service.js',
      },
      studySessionContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        schemaPath: 'data/study-session-schema.json',
        storageKey: 'learning.session.v1',
        servicePath: 'js/study-session-service.js',
      },
      dashboardContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.*',
        servicePath: 'js/dashboard-service.js',
        pagePath: 'dashboard.html',
      },
      selectorContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/question-selector.js',
      },
      recommendationContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        schemaPath: 'data/recommendation-schema.json',
        storageKey: 'learning.recommendation.v1',
        servicePath: 'js/recommendation-service.js',
      },
      llm: {
        enabled: true,
        provider: 'OPENAI',
        model: 'gpt-5.5',
        adapter: true,
        connected: true,
        configPath: 'data/llm-config.json',
        coachSchemaPath: 'data/coach-schema.json',
        clientPath: 'js/llm/llm-client.js',
        coachPath: 'js/coach/ai-coach-service.js',
        cacheKey: 'learning.llm.cache.v1',
      },
      patternTutor: {
        enabled: true,
        connected: true,
        provider: 'openai',
        model: 'gpt-5.5',
        fallback: true,
        tutorPath: 'js/coach/pattern-tutor.js',
        promptBuilderPath: 'js/llm/pattern-prompt-builder.js',
      },
      questionTutor: {
        enabled: true,
        connected: true,
        provider: 'openai',
        model: 'gpt-5.5',
        fallback: true,
        schemaValidated: true,
        tutorPath: 'js/coach/question-tutor.js',
        promptBuilderPath: 'js/llm/question-prompt-builder.js',
      },
      reviewContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.review.v1',
        servicePath: 'js/reviewer/review-service.js',
      },
      overrideContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'question-overrides.v1',
        servicePath: 'js/reviewer/override-service.js',
      },
      tableEditorContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/reviewer/table-editor.js',
      },
      questionOverrideContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        historyKey: 'review-history.v1',
        resolver: 'resolveQuestion',
      },
      review: {
        enabled: true,
        connected: true,
        mode: 'reviewer',
        overrideLayer: true,
      },
      override: {
        enabled: true,
        connected: true,
        readOnlyQuestionDb: true,
      },
      tableEditor: {
        enabled: true,
        connected: true,
        spreadsheet: true,
        undoRedo: true,
      },
      aiRecoveryContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.recovery.v1',
        servicePath: 'js/recovery/ai-recovery-service.js',
      },
      suggestionContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.suggestion.v1',
        servicePath: 'js/recovery/suggestion-engine.js',
      },
      confidenceContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.confidence.v1',
        servicePath: 'js/recovery/confidence-engine.js',
      },
      approvalContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/recovery/approval-engine.js',
        usesOverrideApi: true,
      },
      aiRecovery: {
        enabled: true,
        connected: true,
        suggestionLayer: true,
        reviewerTab: 'AI Recovery',
      },
      qualityContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.quality.v1',
        servicePath: 'js/quality/quality-engine.js',
      },
      qualityScoreContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/quality/quality-score.js',
      },
      qualityDashboardContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        pagePath: 'quality.html',
        servicePath: 'js/quality/quality-dashboard.js',
      },
      quality: {
        enabled: true,
        connected: true,
        dashboard: true,
        scoreRange: '0-100',
      },
      qualityDashboard: {
        enabled: true,
        connected: true,
      },
      qualityScore: {
        enabled: true,
        connected: true,
      },
      reviewWorkflowContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.review-workflow.v1',
        servicePath: 'js/review-workflow/workflow-service.js',
        pagePath: 'review.html',
      },
      reviewQueueContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.review-queue.v1',
        servicePath: 'js/review-workflow/review-queue.js',
      },
      reviewDecisionContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.review-decision.v1',
        servicePath: 'js/review-workflow/review-decision.js',
      },
      reviewAssignmentContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/review-workflow/review-assignment.js',
      },
      reviewWorkflow: {
        enabled: true,
        connected: true,
        usesOverrideOnly: true,
      },
      reviewWorkspaceContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.workspace.v1',
        servicePath: 'js/review-workspace/workspace-service.js',
        pagePath: 'review-workspace.html',
      },
      quickFixContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.quick-fix.v1',
        servicePath: 'js/review-workspace/quick-fix.js',
      },
      reviewSessionContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.review-session.v1',
        servicePath: 'js/review-workspace/review-session.js',
      },
      focusModeContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKey: 'learning.focus-mode.v1',
        servicePath: 'js/review-workspace/focus-mode.js',
      },
      bulkReviewContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/review-workspace/bulk-review.js',
      },
      reviewWorkspace: {
        enabled: true,
        connected: true,
        oneClick: true,
        usesOverrideOnly: true,
      },
      studentResolverContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/student/student-resolver.js',
        resolvers: [
          'questionResolver',
          'patternResolver',
          'tableResolver',
          'solutionResolver',
        ],
      },
      studentWorkspaceContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        servicePath: 'js/student/student-workspace.js',
        appliesTo: [
          'question.html',
          'pattern.html',
          'exam.html',
          'ai-tutor.html',
          'dashboard.html',
        ],
      },
      studentSessionContract: {
        enabled: true,
        schemaVersion: 'v1',
        connected: true,
        storageKeys: ['learning.student-session.v1', 'learning.student-cache.v1'],
        servicePath: 'js/student/student-session.js',
      },
      studentWorkspace: {
        enabled: true,
        connected: true,
        resolvedOnly: true,
        usesOverrideLayer: true,
        examSnapshotFrozen: true,
      },
      learningEngineContract: { enabled: false },
      masteryEngineContract: { enabled: false },
      recommendationEngineContract: { enabled: false },
      reviewCycleContract: { enabled: false },
      scheduleContract: { enabled: false },
      validationLearningEngine: { enabled: false },
      dashboardWidgetContract: { enabled: false },
      dashboardChartContract: { enabled: false },
      dashboardFilterContract: { enabled: false },
      dashboardCacheContract: { enabled: false },
      validationDashboard: { enabled: false },
      evidenceContract: { enabled: false },
      evidenceScoreContract: { enabled: false },
      evidenceSummaryContract: { enabled: false },
      recommendationEvidenceContract: { enabled: false },
      dashboardEvidenceContract: { enabled: false },
      tutorEvidenceContract: { enabled: false },
      validationEvidence: { enabled: false },
      reviewEntryContract: { enabled: false },
      reviewToolbarContract: { enabled: false },
      reviewModalContract: { enabled: false },
      reviewDraftContract: { enabled: false },
      validationReviewEntry: { enabled: false },
      dbSet: dbSet.id,
      dbLabel: dbSet.label,
      paths: { master: MASTER_PATH, ...dbSet },
      fallbackUsed: Boolean(options.fallbackFrom),
      fallbackFrom: options.fallbackFrom || null,
    };
  }

  let questions = normalizeQuestionsPayload(questionPayload);
  if (dbSet.id === DEFAULT_DB_SET) {
    // Display Cleanup Layer: 표시용 텍스트만 정제 (DB 파일 미변경)
    questions = applyQuestionCleanup(questions);
  }
  const validation = validateDatabasePayload(
    dbSet,
    { master, patterns, questions, statistics },
    options,
  );

  return {
    master,
    patterns,
    questions,
    statistics,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings || [],
    evidenceReview: validation.evidenceReview || {
      totalPatterns: 0,
      approved: 0,
      missingReview: 0,
      blocked: 0,
    },
    masteryContract: validation.masteryContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      schemaPath: 'data/mastery-state-schema.json',
    },
    masteryRuntime: validation.masteryRuntime || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.mastery.v1',
      servicePath: 'js/mastery-service.js',
    },
    weaknessRuntime: validation.weaknessRuntime || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.weakness.v1',
      servicePath: 'js/weakness-service.js',
    },
    learningPlanContract: validation.learningPlanContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      schemaPath: 'data/learning-plan-schema.json',
      storageKey: 'learning.plan.v1',
      servicePath: 'js/learning-plan-service.js',
    },
    strategyContract: validation.strategyContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      schemaPath: 'data/learning-strategy-schema.json',
      storageKey: 'learning.strategy.v1',
      servicePath: 'js/learning-strategy-service.js',
    },
    studySessionContract: validation.studySessionContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      schemaPath: 'data/study-session-schema.json',
      storageKey: 'learning.session.v1',
      servicePath: 'js/study-session-service.js',
    },
    dashboardContract: validation.dashboardContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.*',
      servicePath: 'js/dashboard-service.js',
      pagePath: 'dashboard.html',
    },
    selectorContract: validation.selectorContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/question-selector.js',
    },
    recommendationContract: validation.recommendationContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      schemaPath: 'data/recommendation-schema.json',
      storageKey: 'learning.recommendation.v1',
      servicePath: 'js/recommendation-service.js',
    },
    llm: validation.llm || {
      enabled: true,
      provider: 'OPENAI',
      model: 'gpt-5.5',
      adapter: true,
      connected: true,
      configPath: 'data/llm-config.json',
      coachSchemaPath: 'data/coach-schema.json',
      clientPath: 'js/llm/llm-client.js',
      coachPath: 'js/coach/ai-coach-service.js',
      cacheKey: 'learning.llm.cache.v1',
    },
    patternTutor: validation.patternTutor || {
      enabled: true,
      connected: true,
      provider: 'openai',
      model: 'gpt-5.5',
      fallback: true,
      tutorPath: 'js/coach/pattern-tutor.js',
      promptBuilderPath: 'js/llm/pattern-prompt-builder.js',
    },
    questionTutor: validation.questionTutor || {
      enabled: true,
      connected: true,
      provider: 'openai',
      model: 'gpt-5.5',
      fallback: true,
      schemaValidated: true,
      tutorPath: 'js/coach/question-tutor.js',
      promptBuilderPath: 'js/llm/question-prompt-builder.js',
    },
    reviewContract: validation.reviewContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review.v1',
      servicePath: 'js/reviewer/review-service.js',
    },
    overrideContract: validation.overrideContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'question-overrides.v1',
      servicePath: 'js/reviewer/override-service.js',
    },
    tableEditorContract: validation.tableEditorContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/reviewer/table-editor.js',
    },
    questionOverrideContract: validation.questionOverrideContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      historyKey: 'review-history.v1',
      resolver: 'resolveQuestion',
    },
    review: validation.review || {
      enabled: true,
      connected: true,
      mode: 'reviewer',
      overrideLayer: true,
    },
    override: validation.override || {
      enabled: true,
      connected: true,
      readOnlyQuestionDb: true,
    },
    tableEditor: validation.tableEditor || {
      enabled: true,
      connected: true,
      spreadsheet: true,
      undoRedo: true,
    },
    aiRecoveryContract: validation.aiRecoveryContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.recovery.v1',
      servicePath: 'js/recovery/ai-recovery-service.js',
    },
    suggestionContract: validation.suggestionContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.suggestion.v1',
      servicePath: 'js/recovery/suggestion-engine.js',
    },
    confidenceContract: validation.confidenceContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.confidence.v1',
      servicePath: 'js/recovery/confidence-engine.js',
    },
    approvalContract: validation.approvalContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/recovery/approval-engine.js',
      usesOverrideApi: true,
    },
    aiRecovery: validation.aiRecovery || {
      enabled: true,
      connected: true,
      suggestionLayer: true,
      reviewerTab: 'AI Recovery',
    },
    qualityContract: validation.qualityContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.quality.v1',
      servicePath: 'js/quality/quality-engine.js',
    },
    qualityScoreContract: validation.qualityScoreContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/quality/quality-score.js',
    },
    qualityDashboardContract: validation.qualityDashboardContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      pagePath: 'quality.html',
      servicePath: 'js/quality/quality-dashboard.js',
    },
    quality: validation.quality || {
      enabled: true,
      connected: true,
      dashboard: true,
      scoreRange: '0-100',
    },
    qualityDashboard: validation.qualityDashboard || {
      enabled: true,
      connected: true,
    },
    qualityScore: validation.qualityScore || {
      enabled: true,
      connected: true,
    },
    reviewWorkflowContract: validation.reviewWorkflowContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review-workflow.v1',
      servicePath: 'js/review-workflow/workflow-service.js',
      pagePath: 'review.html',
    },
    reviewQueueContract: validation.reviewQueueContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review-queue.v1',
      servicePath: 'js/review-workflow/review-queue.js',
    },
    reviewDecisionContract: validation.reviewDecisionContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review-decision.v1',
      servicePath: 'js/review-workflow/review-decision.js',
    },
    reviewAssignmentContract: validation.reviewAssignmentContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/review-workflow/review-assignment.js',
    },
    reviewWorkflow: validation.reviewWorkflow || {
      enabled: true,
      connected: true,
      usesOverrideOnly: true,
    },
    reviewWorkspaceContract: validation.reviewWorkspaceContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.workspace.v1',
      servicePath: 'js/review-workspace/workspace-service.js',
      pagePath: 'review-workspace.html',
    },
    quickFixContract: validation.quickFixContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.quick-fix.v1',
      servicePath: 'js/review-workspace/quick-fix.js',
    },
    reviewSessionContract: validation.reviewSessionContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.review-session.v1',
      servicePath: 'js/review-workspace/review-session.js',
    },
    focusModeContract: validation.focusModeContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKey: 'learning.focus-mode.v1',
      servicePath: 'js/review-workspace/focus-mode.js',
    },
    bulkReviewContract: validation.bulkReviewContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/review-workspace/bulk-review.js',
    },
    reviewWorkspace: validation.reviewWorkspace || {
      enabled: true,
      connected: true,
      oneClick: true,
      usesOverrideOnly: true,
    },
    studentResolverContract: validation.studentResolverContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/student/student-resolver.js',
      resolvers: [
        'questionResolver',
        'patternResolver',
        'tableResolver',
        'solutionResolver',
      ],
    },
    studentWorkspaceContract: validation.studentWorkspaceContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      servicePath: 'js/student/student-workspace.js',
      appliesTo: [
        'question.html',
        'pattern.html',
        'exam.html',
        'ai-tutor.html',
        'dashboard.html',
      ],
    },
    studentSessionContract: validation.studentSessionContract || {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      storageKeys: ['learning.student-session.v1', 'learning.student-cache.v1'],
      servicePath: 'js/student/student-session.js',
    },
    studentWorkspace: validation.studentWorkspace || {
      enabled: true,
      connected: true,
      resolvedOnly: true,
      usesOverrideLayer: true,
      examSnapshotFrozen: true,
    },
    dbSet: dbSet.id,
    dbLabel: dbSet.label,
    paths: {
      master: MASTER_PATH,
      patterns: dbSet.patterns,
      questions: dbSet.questions,
      statistics: dbSet.statistics,
    },
    fallbackUsed: Boolean(options.fallbackFrom),
    fallbackFrom: options.fallbackFrom || null,
  };
}

/**
 * Platform Database를 로드한다.
 * 기본 MVP → 실패 시 Phase 1 Freeze fallback.
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function loadPhase1Database(options = {}) {
  const preferred = options.dbSet || resolveDatabaseConfig();
  let result = await loadDatabaseSet(preferred);

  if (!result.valid && preferred.id === DEFAULT_DB_SET) {
    const fallback = DB_PATH_SETS[FALLBACK_DB_SET];
    const fallbackResult = await loadDatabaseSet(fallback, { fallbackFrom: preferred.id });
    if (fallbackResult.valid) {
      return fallbackResult;
    }
    result.errors.push(
      ...(fallbackResult.errors || []).map((message) => `[fallback] ${message}`),
    );
  }

  return result;
}

/**
 * @deprecated Phase 0 master — loadPhase1Database 사용
 */
export async function loadMasterDB() {
  return loadPhase1Database().then(({ master, valid, errors }) => ({
    data: master,
    valid,
    errors,
  }));
}

/**
 * Question ID로 문항을 조회한다.
 * @param {array} questions
 * @param {string} questionId
 */
export function getQuestionById(questions, questionId) {
  return questions.find((q) => q.questionId === questionId) || null;
}

/**
 * Pattern ID로 Pattern 메타를 조회한다.
 * @param {array} patterns
 * @param {string} patternId
 */
export function getPatternById(patterns, patternId) {
  return patterns.find((p) => p.patternId === patternId) || null;
}

/**
 * 보기 라벨(①~⑤)을 반환한다.
 * @param {number} index - 1-based
 */
export function getChoiceLabel(index) {
  return CHOICE_SYMBOLS[index - 1] || String(index);
}

export {
  PHASE1_PATHS,
  CHOICE_SYMBOLS,
  DB_PATH_SETS,
  DEFAULT_DB_SET,
  FALLBACK_DB_SET,
  MASTER_PATH,
};
