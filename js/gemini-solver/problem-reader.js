/**
 * Sprint-17A — Problem Reader
 * Reads Resolved Question only. Never reads raw DB when override exists.
 */

import { getOverride } from '../reviewer/override-service.js';

/**
 * Compute override version stamp for cache invalidation.
 * @param {string} questionId
 */
export function resolveOverrideVersion(questionId) {
  try {
    const ov = getOverride(questionId);
    if (!ov) return '0';
    if (ov.override?.geminiNative?.version) {
      return String(ov.override.geminiNative.version);
    }
    const stamp = ov.override?.reviewDate || ov.updatedAt || ov.status || '1';
    return String(stamp);
  } catch (_err) {
    return '0';
  }
}

/**
 * Extract Problem First payload from a Resolved Question.
 * @param {object} question — resolved student question
 * @param {object|null} pattern — metadata only
 */
export function readProblem(question = {}, pattern = null) {
  const questionId = question.questionId || question.id || null;
  const questionText =
    question.question
    || question.stem
    || question.originalQuestion
    || question.title
    || '';

  let tableHtml = '';
  if (typeof question.table === 'string') {
    tableHtml = question.table;
  } else if (question.table && typeof question.table === 'object') {
    tableHtml = question.table.html || question.table.markup || JSON.stringify(question.table);
  } else if (typeof question.tableHtml === 'string') {
    tableHtml = question.tableHtml;
  }

  const choices = Array.isArray(question.choices)
    ? question.choices.map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') return String(c.text ?? c.label ?? c.value ?? '');
        return String(c ?? '');
      })
    : [];

  const correctAnswer = Number(question.answer ?? question.answerIndex ?? question.correctAnswer);

  const patternMetadata = {
    patternId: question.patternId || pattern?.patternId || null,
    patternName: pattern?.name || question.patternName || null,
    primaryPattern: question.primaryPattern || pattern?.primaryPattern || null,
  };

  let approvedGemini = null;
  try {
    const ov = questionId ? getOverride(questionId) : null;
    if (ov?.override?.geminiNative?.payload) {
      approvedGemini = ov.override.geminiNative;
    }
  } catch (_err) {
    approvedGemini = null;
  }

  return {
    questionId,
    questionText: String(questionText),
    tableHtml: String(tableHtml || ''),
    choices,
    correctAnswer: Number.isFinite(correctAnswer) ? correctAnswer : null,
    patternMetadata,
    overrideVersion: resolveOverrideVersion(questionId),
    approvedGemini,
    selectedAnswer: null,
  };
}

/**
 * Attach student grade selection into reader payload.
 */
export function attachGrade(readerPayload, grade = {}) {
  const selected = grade.selected ?? grade.selectedAnswer ?? null;
  return {
    ...readerPayload,
    selectedAnswer: selected == null ? null : Number(selected),
    isCorrect:
      grade.result === 'correct'
      || (selected != null
        && readerPayload.correctAnswer != null
        && Number(selected) === Number(readerPayload.correctAnswer)),
  };
}

export default {
  readProblem,
  attachGrade,
  resolveOverrideVersion,
};
