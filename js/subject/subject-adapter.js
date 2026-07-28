/**
 * Sprint-19A — Subject Adapter (facade)
 * Platform → Subject Adapter → Accounting / Economics / Civil / …
 * Learning Engine formulas / Recommendation / Override / Runtime unchanged.
 */

import {
  SUBJECT_ADAPTER_VERSION,
  DEFAULT_SUBJECT_ID,
  SUBJECT_IDS,
  SUBJECT_LABELS,
  SUBJECT_FULL_NAMES,
  normalizeSubjectId,
} from './subject-config.js';
import {
  registerSubject,
  ensureBuiltinSubjectsRegistered,
  getRegisteredSubject,
  listSubjects,
  listEnabledSubjects,
} from './subject-registry.js';
import {
  loadSubject,
  getLoadedSubject,
  loadAllSubjects,
} from './subject-loader.js';
import {
  getCurrentSubjectId,
  getCurrentSubject,
  setCurrentSubjectId,
  buildSubjectContext,
  buildLearningContext,
  buildStudentContext,
  listSubjectOptions,
} from './subject-context.js';
import {
  switchSubject,
  switchSubjectSync,
  onSubjectChange,
  resolveSubjectIdForQuestion,
} from './subject-router.js';
import {
  buildSubjectSolvePrompt,
  buildSubjectPromptBlock,
  extractSubjectRole,
  SUBJECT_PROMPT_VERSION,
} from './subject-prompt-builder.js';

/**
 * Formulas for current (or given) subject.
 * @param {string} [subjectId]
 * @returns {Record<string, object>}
 */
export function getSubjectFormulas(subjectId) {
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const plugin = getLoadedSubject(id);
  return plugin.formulaDb?.formulas || {};
}

/**
 * Extra formulas by patternId.
 * @param {string} patternId
 * @param {string} [subjectId]
 */
export function getSubjectFormulaExtras(patternId, subjectId) {
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  const plugin = getLoadedSubject(id);
  const extras = plugin.formulaDb?.extras || {};
  return extras[patternId] || [];
}

/**
 * Memory config for subject.
 * @param {string} [subjectId]
 */
export function getSubjectMemoryConfig(subjectId) {
  const id = normalizeSubjectId(subjectId || getCurrentSubjectId());
  return getLoadedSubject(id).memoryConfig;
}

/**
 * Resolve weak-memory banner message via subject memory templates.
 * @param {{ patternId?: string, mistakeCode?: string, label?: string, patternName?: string, subjectId?: string }} hit
 */
export function resolveMemoryMessage(hit = {}) {
  const cfg = getSubjectMemoryConfig(hit.subjectId);
  const templates = Array.isArray(cfg?.templates) ? cfg.templates : [];
  const patternId = hit.patternId || '';
  const code = String(hit.mistakeCode || '');
  const patternName = hit.patternName || patternId || '이 Pattern';
  const label = hit.label || code || '동일 실수';

  for (const t of templates) {
    if (t.id === 'default') continue;
    const match = t.match || {};
    const pids = match.patternIds || [];
    const codes = match.mistakeCodes || [];
    const pidOk = !pids.length || pids.includes(patternId) || pids.includes('*');
    const codeOk =
      !codes.length
      || codes.some((c) => new RegExp(c, 'i').test(code));
    if (pidOk && codeOk && t.message) return t.message;
  }

  const def = templates.find((t) => t.id === 'default') || templates[templates.length - 1];
  if (def?.message) return def.message;
  if (def?.messageTemplate) {
    return String(def.messageTemplate)
      .replace('{patternName}', patternName)
      .replace('{label}', label)
      .replace('{mistakeCode}', code);
  }
  return `${patternName}에서 「${label}」를 반복하고 있습니다.`;
}

/**
 * subjectId to pass into Learning Engine (formulas unchanged).
 * @param {object} [question]
 */
export function subjectIdForLearningEngine(question = {}) {
  return resolveSubjectIdForQuestion(question) || getCurrentSubjectId();
}

/**
 * Contract snapshot for data-loader validation.
 */
export function getSubjectAdapterContractSnapshot() {
  ensureBuiltinSubjectsRegistered();
  return {
    subjectAdapterContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      sprint: 'Sprint-19A',
      version: SUBJECT_ADAPTER_VERSION,
      defaultSubjectId: DEFAULT_SUBJECT_ID,
      subjectIds: [...SUBJECT_IDS],
      servicePath: 'js/subject/subject-adapter.js',
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
      recommendationUnchanged: true,
      overrideUnchanged: true,
      runtimeUnchanged: true,
      geminiSolverUnchanged: true,
    },
    subjectRegistryContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      registerSubject: true,
      getCurrentSubject: true,
      loadSubject: true,
      switchSubject: true,
      subjects: listSubjects().map((s) => s.id),
    },
    subjectPromptContract: {
      enabled: true,
      schemaVersion: 'v1',
      connected: true,
      version: SUBJECT_PROMPT_VERSION,
      composition: [
        'Subject Prompt',
        'Resolved Question',
        'Learning Context',
        'Student Context',
      ],
      accountingHardcodedRemoved: true,
    },
    validationSubjectAdapter: {
      enabled: true,
      sprint: 'Sprint-19A',
      modules: 7,
      plugins: SUBJECT_IDS.length,
      storageKeys: 3,
      dbWriteForbidden: true,
      learningEngineUnchanged: true,
    },
  };
}

export {
  SUBJECT_ADAPTER_VERSION,
  DEFAULT_SUBJECT_ID,
  SUBJECT_IDS,
  SUBJECT_LABELS,
  SUBJECT_FULL_NAMES,
  SUBJECT_PROMPT_VERSION,
  registerSubject,
  ensureBuiltinSubjectsRegistered,
  getRegisteredSubject,
  listSubjects,
  listEnabledSubjects,
  loadSubject,
  getLoadedSubject,
  loadAllSubjects,
  getCurrentSubjectId,
  getCurrentSubject,
  setCurrentSubjectId,
  buildSubjectContext,
  buildLearningContext,
  buildStudentContext,
  listSubjectOptions,
  switchSubject,
  switchSubjectSync,
  onSubjectChange,
  resolveSubjectIdForQuestion,
  buildSubjectSolvePrompt,
  buildSubjectPromptBlock,
  extractSubjectRole,
  normalizeSubjectId,
};

export default {
  SUBJECT_ADAPTER_VERSION,
  registerSubject,
  getCurrentSubject,
  getCurrentSubjectId,
  loadSubject,
  switchSubject,
  switchSubjectSync,
  getSubjectFormulas,
  getSubjectFormulaExtras,
  getSubjectMemoryConfig,
  resolveMemoryMessage,
  buildSubjectSolvePrompt,
  subjectIdForLearningEngine,
  getSubjectAdapterContractSnapshot,
};
