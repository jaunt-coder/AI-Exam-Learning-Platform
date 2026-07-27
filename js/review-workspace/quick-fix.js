/**
 * Sprint-12E — Quick Fix (one-click) via Override Layer only
 */

import { getOverride, saveOverride } from '../reviewer/override-service.js';
import { runAiRecovery } from '../recovery/ai-recovery-service.js';
import { approveByField, approveAll } from '../recovery/approval-engine.js';
import {
  loadQuickFixDoc,
  saveQuickFixDoc,
} from './workspace-storage.js';

export const QUICK_FIX_TYPES = Object.freeze([
  'OCR',
  'TABLE',
  'CHOICES',
  'PATTERN',
  'SOLUTION',
]);

/**
 * Record before/after quick-fix history.
 */
function recordQuickFixHistory({
  questionId,
  type,
  before,
  after,
  reviewer,
  reason,
}) {
  const doc = loadQuickFixDoc();
  const entry = {
    questionId,
    type,
    before,
    after,
    reviewer: reviewer || 'local',
    date: new Date().toISOString(),
    reason: reason || `One-click Fix ${type}`,
  };
  doc.history = [...doc.history, entry].slice(-500);
  doc.byQuestion[questionId] = {
    ...(doc.byQuestion[questionId] || {}),
    lastType: type,
    updatedAt: entry.date,
  };
  saveQuickFixDoc(doc);
  return entry;
}

/**
 * Apply AI suggestion field if present, else light heuristic patch.
 * @param {object} originalQuestion
 * @param {string} type
 * @param {{ reviewer?: string }} [meta]
 */
export function applyQuickFix(originalQuestion, type, meta = {}) {
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  const fixType = String(type || '').toUpperCase();
  if (!qid) return { ok: false, error: 'missing_questionId' };
  if (!QUICK_FIX_TYPES.includes(fixType)) {
    return { ok: false, error: 'invalid_fix_type' };
  }

  const beforeOverride = getOverride(qid);
  const before = beforeOverride?.override
    ? JSON.parse(JSON.stringify(beforeOverride.override))
    : null;

  /* Ensure AI suggestions exist */
  let pack = null;
  try {
    pack = runAiRecovery(originalQuestion);
  } catch (_err) {
    pack = null;
  }

  const fieldMap = {
    OCR: 'question',
    TABLE: 'table',
    CHOICES: 'choices',
    PATTERN: 'patternId',
    SOLUTION: 'solution',
  };
  const field = fieldMap[fixType];

  let result;
  if (fixType === 'OCR' || fixType === 'TABLE' || fixType === 'CHOICES') {
    const hit = (pack?.changes || []).find(
      (c) => String(c.field).toLowerCase() === field,
    );
    if (hit) {
      result = approveByField(qid, pack, field, pack.confidence);
    } else if (fixType === 'OCR') {
      const text = String(
        originalQuestion.question || originalQuestion.originalQuestion || '',
      )
        .replace(/종합원\s*가계산/g, '종합원가계산')
        .replace(/([가-힣])\s+(?=[가-힣])/g, '$1');
      result = saveOverride(
        qid,
        {
          question: text,
          originalQuestion: text,
          reviewFlags: ['TEXT_FIXED', 'OCR_ERROR'],
        },
        {
          reviewer: meta.reviewer || 'local',
          changedFields: ['question'],
          status: 'REVIEWED',
        },
      );
    } else {
      return { ok: false, error: 'no_suggestion_for_field', field };
    }
  } else if (fixType === 'PATTERN') {
    const suggested =
      (pack?.detections || []).includes('PATTERN_SUSPICIOUS') ||
      (pack?.detections || []).includes('MISSING_TABLE')
        ? 'COST_PROCESS_001'
        : null;
    if (!suggested) {
      return { ok: false, error: 'no_pattern_suggestion' };
    }
    result = saveOverride(
      qid,
      {
        patternId: suggested,
        patternMemo: 'Quick Fix Pattern from Reviewer Workspace',
        reviewFlags: ['PATTERN_FIXED', 'PATTERN_MISMATCH'],
      },
      {
        reviewer: meta.reviewer || 'local',
        changedFields: ['patternId'],
        status: 'REVIEWED',
      },
    );
  } else if (fixType === 'SOLUTION') {
    const explain =
      (pack?.explains && pack.explains[0]) ||
      'AI Recovery / Reviewer Workspace에서 복원된 해설 초안입니다.';
    result = saveOverride(
      qid,
      {
        solution: {
          ...(originalQuestion.solution || {}),
          summary: explain,
          explanation: explain,
        },
        reviewFlags: ['SOLUTION_FIXED'],
      },
      {
        reviewer: meta.reviewer || 'local',
        changedFields: ['solution'],
        status: 'REVIEWED',
      },
    );
  }

  const afterOverride = getOverride(qid);
  const history = recordQuickFixHistory({
    questionId: qid,
    type: fixType,
    before,
    after: afterOverride?.override || null,
    reviewer: meta.reviewer || 'local',
    reason: `Fix ${fixType}`,
  });

  return {
    ok: true,
    type: fixType,
    result,
    history,
    pack,
  };
}

/**
 * Apply all AI suggestions at once (Approve AI).
 */
export function quickApproveAllAi(originalQuestion, meta = {}) {
  const qid = originalQuestion?.questionId || originalQuestion?.id;
  if (!qid) return { ok: false, error: 'missing_questionId' };
  const pack = runAiRecovery(originalQuestion);
  const result = approveAll(qid, pack, pack.confidence);
  recordQuickFixHistory({
    questionId: qid,
    type: 'APPROVE_AI',
    before: null,
    after: getOverride(qid)?.override || null,
    reviewer: meta.reviewer || 'local',
    reason: 'Approve All AI suggestions',
  });
  return { ok: true, result, pack };
}

export function getQuickFixHistory(questionId) {
  const doc = loadQuickFixDoc();
  if (!questionId) return doc.history.slice();
  return doc.history.filter((h) => h.questionId === questionId);
}

export default {
  QUICK_FIX_TYPES,
  applyQuickFix,
  quickApproveAllAi,
  getQuickFixHistory,
};
