/**
 * Sprint-16B — Exam Goal / Progress / Phase Storage
 * Additive LocalStorage only. Never writes DB / Override / LE formulas.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const EXAM_GOAL_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyGoal() {
  return {
    schemaVersion: EXAM_GOAL_SCHEMA,
    examDate: null,
    targetScore: null,
    currentScore: null,
    availableMinutes: null,
    subjects: [],
    createdAt: null,
    updatedAt: null,
  };
}

function emptyProgress() {
  return {
    schemaVersion: EXAM_GOAL_SCHEMA,
    byDate: {},
    streak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    updatedAt: null,
  };
}

function emptyPhase() {
  return {
    schemaVersion: EXAM_GOAL_SCHEMA,
    phase: 'FOUNDATION',
    daysRemaining: null,
    label: 'Foundation',
    recommendation: [],
    updatedAt: null,
  };
}

export function loadExamGoalDoc() {
  return getItem(STORAGE_KEYS.LEARNING_EXAM_GOAL_V1, emptyGoal()) || emptyGoal();
}

export function saveExamGoalDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_EXAM_GOAL_V1, touch(doc || emptyGoal()));
}

export function persistExamGoal(goal) {
  const prev = loadExamGoalDoc();
  const now = new Date().toISOString();
  const next = {
    ...emptyGoal(),
    ...prev,
    ...goal,
    schemaVersion: EXAM_GOAL_SCHEMA,
    createdAt: prev.createdAt || now,
    updatedAt: now,
  };
  saveExamGoalDoc(next);
  return next;
}

export function loadExamProgressDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_EXAM_PROGRESS_V1, emptyProgress())
    || emptyProgress()
  );
}

export function saveExamProgressDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_EXAM_PROGRESS_V1,
    touch(doc || emptyProgress()),
  );
}

export function loadExamPhaseDoc() {
  return getItem(STORAGE_KEYS.LEARNING_EXAM_PHASE_V1, emptyPhase()) || emptyPhase();
}

export function saveExamPhaseDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_EXAM_PHASE_V1, touch(doc || emptyPhase()));
}

export function persistExamPhase(phasePayload) {
  const doc = {
    ...emptyPhase(),
    ...phasePayload,
    schemaVersion: EXAM_GOAL_SCHEMA,
    updatedAt: new Date().toISOString(),
  };
  saveExamPhaseDoc(doc);
  return doc;
}

export default {
  EXAM_GOAL_SCHEMA,
  loadExamGoalDoc,
  saveExamGoalDoc,
  persistExamGoal,
  loadExamProgressDoc,
  saveExamProgressDoc,
  loadExamPhaseDoc,
  persistExamPhase,
};
