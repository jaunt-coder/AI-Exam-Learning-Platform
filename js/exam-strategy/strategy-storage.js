/**
 * Sprint-16A — Exam Strategy Storage
 * Additive LocalStorage only. Never writes Question / Pattern / Statistics DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const EXAM_STRATEGY_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyReadiness() {
  return {
    schemaVersion: EXAM_STRATEGY_SCHEMA,
    score: null,
    factors: null,
    history: [],
    updatedAt: null,
  };
}

function emptyStrategyState() {
  return {
    schemaVersion: EXAM_STRATEGY_SCHEMA,
    latest: null,
    history: [],
    updatedAt: null,
  };
}

function emptyDailyPlan() {
  return {
    schemaVersion: EXAM_STRATEGY_SCHEMA,
    byDate: {},
    latest: null,
    updatedAt: null,
  };
}

function emptyPatternRisk() {
  return {
    schemaVersion: EXAM_STRATEGY_SCHEMA,
    byPattern: {},
    topRisks: [],
    updatedAt: null,
  };
}

function emptyExamMode() {
  return {
    schemaVersion: EXAM_STRATEGY_SCHEMA,
    enabled: false,
    examDate: null,
    daysRemaining: null,
    phase: 'NORMAL',
    focus: null,
    updatedAt: null,
  };
}

export function loadExamReadinessDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_EXAM_READINESS_V1, emptyReadiness())
    || emptyReadiness()
  );
}

export function saveExamReadinessDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_EXAM_READINESS_V1,
    touch(doc || emptyReadiness()),
  );
}

export function persistExamReadiness(payload) {
  const doc = loadExamReadinessDoc();
  doc.score = payload.score;
  doc.factors = payload.factors;
  doc.level = payload.level;
  doc.passProbability = payload.passProbability;
  if (!Array.isArray(doc.history)) doc.history = [];
  doc.history.push({
    score: payload.score,
    at: new Date().toISOString(),
  });
  if (doc.history.length > 60) doc.history = doc.history.slice(-60);
  saveExamReadinessDoc(doc);
  return doc;
}

export function loadStrategyStateDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_STRATEGY_STATE_V1, emptyStrategyState())
    || emptyStrategyState()
  );
}

export function saveStrategyStateDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_STRATEGY_STATE_V1,
    touch(doc || emptyStrategyState()),
  );
}

export function persistStrategyState(strategy) {
  const doc = loadStrategyStateDoc();
  doc.latest = { ...strategy, savedAt: new Date().toISOString() };
  if (!Array.isArray(doc.history)) doc.history = [];
  doc.history.push({
    passProbability: strategy?.passProbability,
    topWeakness: strategy?.topWeakness?.label || null,
    at: new Date().toISOString(),
  });
  if (doc.history.length > 40) doc.history = doc.history.slice(-40);
  saveStrategyStateDoc(doc);
  return doc;
}

export function loadDailyPlanDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_DAILY_PLAN_V1, emptyDailyPlan())
    || emptyDailyPlan()
  );
}

export function saveDailyPlanDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_DAILY_PLAN_V1,
    touch(doc || emptyDailyPlan()),
  );
}

export function persistDailyPlan(plan) {
  const doc = loadDailyPlanDoc();
  const dateKey = plan?.date || new Date().toISOString().slice(0, 10);
  if (!doc.byDate) doc.byDate = {};
  doc.byDate[dateKey] = { ...plan, savedAt: new Date().toISOString() };
  doc.latest = doc.byDate[dateKey];
  saveDailyPlanDoc(doc);
  return doc.byDate[dateKey];
}

export function loadPatternRiskDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_PATTERN_RISK_V1, emptyPatternRisk())
    || emptyPatternRisk()
  );
}

export function savePatternRiskDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_PATTERN_RISK_V1,
    touch(doc || emptyPatternRisk()),
  );
}

export function persistPatternRisk(payload) {
  const doc = loadPatternRiskDoc();
  doc.byPattern = payload.byPattern || {};
  doc.topRisks = payload.topRisks || [];
  savePatternRiskDoc(doc);
  return doc;
}

export function loadExamModeDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_EXAM_MODE_V1, emptyExamMode())
    || emptyExamMode()
  );
}

export function saveExamModeDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_EXAM_MODE_V1,
    touch(doc || emptyExamMode()),
  );
}

export function persistExamMode(mode) {
  const doc = {
    ...loadExamModeDoc(),
    ...mode,
    schemaVersion: EXAM_STRATEGY_SCHEMA,
  };
  saveExamModeDoc(doc);
  return doc;
}

export default {
  EXAM_STRATEGY_SCHEMA,
  loadExamReadinessDoc,
  persistExamReadiness,
  loadStrategyStateDoc,
  persistStrategyState,
  loadDailyPlanDoc,
  persistDailyPlan,
  loadPatternRiskDoc,
  persistPatternRisk,
  loadExamModeDoc,
  persistExamMode,
};
