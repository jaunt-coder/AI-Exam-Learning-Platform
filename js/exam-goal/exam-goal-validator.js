/**
 * Sprint-16B — Exam Goal Validator
 */

const SUBJECT_ALLOW = new Set(['ACC', 'ACC_INV', '회계학', '재고자산']);

/**
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[], normalized: object|null }}
 */
export function validateExamGoal(input = {}) {
  const errors = [];
  const examDate = String(input.examDate || '').trim();
  const targetScore = Number(input.targetScore);
  const currentScore = Number(input.currentScore);
  const availableMinutes = Number(input.availableMinutes);
  const subjects = Array.isArray(input.subjects)
    ? input.subjects.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (!examDate) {
    errors.push('examDate_required');
  } else {
    const d = new Date(examDate);
    if (Number.isNaN(d.getTime())) errors.push('examDate_invalid');
  }

  if (!Number.isFinite(targetScore) || targetScore < 0 || targetScore > 100) {
    errors.push('targetScore_range_0_100');
  }
  if (!Number.isFinite(currentScore) || currentScore < 0 || currentScore > 100) {
    errors.push('currentScore_range_0_100');
  }
  if (!Number.isFinite(availableMinutes) || availableMinutes < 5 || availableMinutes > 720) {
    errors.push('availableMinutes_range_5_720');
  }
  if (!subjects.length) {
    errors.push('subjects_required');
  }

  if (errors.length) {
    return { ok: false, errors, normalized: null };
  }

  return {
    ok: true,
    errors: [],
    normalized: {
      examDate: examDate.slice(0, 10),
      targetScore: Math.round(targetScore),
      currentScore: Math.round(currentScore),
      availableMinutes: Math.round(availableMinutes),
      subjects,
    },
  };
}

export function isAllowedSubject(subject) {
  return SUBJECT_ALLOW.has(String(subject || ''));
}

export default {
  validateExamGoal,
  isAllowedSubject,
};
