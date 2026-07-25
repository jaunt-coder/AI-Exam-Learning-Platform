/**
 * M1 Learning Loop orchestrator
 * Question → Answer → Grade → Attempt → State → Mastery → Dashboard projection
 */

import { submitAttempt } from './attempt-service.js';
import {
  applyAndSaveAttemptEvent,
  createEmptyLearningState,
  loadLearningState,
  projectDashboard,
  saveLearningState,
} from './state-update.js';
import { recordAttempt } from '../js/mastery-service.js';
import { recordWeaknessDiagnosis } from '../js/weakness-service.js';

/**
 * Run one complete learning cycle
 * (deterministic mastery + weakness · no AI recommendation).
 * @param {object} input
 * @returns {object}
 */
export function runLearningLoopCycle(input = {}) {
  const studentId = input.studentId || 'm1_demo_student';
  let state = loadLearningState(studentId);
  if (!state || state.student_id !== studentId) {
    state = createEmptyLearningState(studentId);
    saveLearningState(state);
  }

  const submitted = submitAttempt({
    studentId,
    questionId: input.questionId,
    patternId: input.patternId,
    selectedAnswer: input.selectedAnswer,
    correctAnswer: input.correctAnswer,
    correctAnswerReference: input.correctAnswerReference,
  });

  if (!submitted.ok) {
    return {
      ok: false,
      stage: 'attempt',
      error: submitted.error,
      grade: submitted.grade || null,
      dashboard: projectDashboard(state, input.patternId),
    };
  }

  const updated = applyAndSaveAttemptEvent(state, submitted.event);
  if (!updated.ok) {
    return {
      ok: false,
      stage: 'state_update',
      error: updated.error,
      event: submitted.event,
      grade: submitted.grade,
      dashboard: projectDashboard(state, input.patternId),
    };
  }

  /* Sprint-09K — Pattern Mastery runtime (LocalStorage learning.mastery.v1) */
  const isCorrect = submitted.grade?.result === 'correct';
  const mastery = recordAttempt({
    studentId,
    questionId: submitted.event.question_id || input.questionId,
    patternId: submitted.event.pattern_id || input.patternId,
    correct: isCorrect,
    timestamp: submitted.event.timestamp || new Date().toISOString(),
  });

  /* Sprint-09L — Weakness Detection (LocalStorage learning.weakness.v1) */
  let weakness = { ok: false };
  if (mastery.ok && mastery.entry) {
    weakness = recordWeaknessDiagnosis({
      studentId,
      patternMastery: mastery.entry,
      lastCorrect: isCorrect,
      durationMs: input.durationMs,
    });
  }

  return {
    ok: true,
    stage: 'complete',
    grade: submitted.grade,
    event: submitted.event,
    state: updated.state,
    mastery: mastery.ok ? mastery.entry : null,
    masteryUpdate: mastery,
    weakness: weakness.ok ? weakness.diagnosis : null,
    weaknessUpdate: weakness,
    dashboard: projectDashboard(updated.state, input.patternId),
    guarantees: {
      mastery_runtime_connected: true,
      weakness_runtime_connected: true,
      recommendation_absent: true,
      question_db_untouched: true,
      answer_sot_untouched: true,
      pattern_db_untouched: true,
    },
  };
}

export default { runLearningLoopCycle };
