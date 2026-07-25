/**
 * M1 Learning Loop orchestrator
 * Question → Answer → Grade → Attempt → State → Dashboard projection
 */

import { submitAttempt } from './attempt-service.js';
import {
  applyAndSaveAttemptEvent,
  createEmptyLearningState,
  loadLearningState,
  projectDashboard,
  saveLearningState,
} from './state-update.js';

/**
 * Run one complete learning cycle (no mastery execution, no recommendation).
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

  return {
    ok: true,
    stage: 'complete',
    grade: submitted.grade,
    event: submitted.event,
    state: updated.state,
    dashboard: projectDashboard(updated.state, input.patternId),
    guarantees: {
      mastery_unchanged_unknown: true,
      recommendation_absent: true,
      question_db_untouched: true,
      answer_sot_untouched: true,
      pattern_db_untouched: true,
    },
  };
}

export default { runLearningLoopCycle };
