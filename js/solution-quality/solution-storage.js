/**
 * Sprint-15C — Solution Quality Storage
 * Additive LocalStorage only. Never writes Question / Pattern / Statistics DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const SOLUTION_QUALITY_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyQuality() {
  return {
    schemaVersion: SOLUTION_QUALITY_SCHEMA,
    byQuestion: {},
    aggregate: { average: 0, count: 0, needsImprove: [] },
    updatedAt: null,
  };
}

function emptyBlueprint() {
  return {
    schemaVersion: SOLUTION_QUALITY_SCHEMA,
    byQuestion: {},
    updatedAt: null,
  };
}

function emptyReview() {
  return {
    schemaVersion: SOLUTION_QUALITY_SCHEMA,
    byQuestion: {},
    updatedAt: null,
  };
}

function emptyImprovement() {
  return {
    schemaVersion: SOLUTION_QUALITY_SCHEMA,
    byQuestion: {},
    latest: null,
    updatedAt: null,
  };
}

export function loadSolutionQualityDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_SOLUTION_QUALITY_V1, emptyQuality())
    || emptyQuality()
  );
}

export function saveSolutionQualityDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_SOLUTION_QUALITY_V1,
    touch(doc || emptyQuality()),
  );
}

export function persistSolutionQuality(questionId, payload) {
  const doc = loadSolutionQualityDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  const rows = Object.values(doc.byQuestion);
  const totals = rows
    .map((r) => Number(r.qualityScore?.total ?? r.total ?? 0))
    .filter((n) => Number.isFinite(n));
  const average = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
    : 0;
  const needsImprove = rows
    .filter((r) => Number(r.qualityScore?.total ?? r.total ?? 0) < 70)
    .map((r) => ({
      questionId: r.questionId || null,
      patternId: r.patternId || null,
      total: Number(r.qualityScore?.total ?? r.total ?? 0),
    }))
    .sort((a, b) => a.total - b.total)
    .slice(0, 10);
  /* fix questionId on rows */
  Object.entries(doc.byQuestion).forEach(([qid, row]) => {
    row.questionId = qid;
  });
  doc.aggregate = {
    average,
    count: rows.length,
    needsImprove: needsImprove.map((r) => ({
      ...r,
      questionId: r.questionId || Object.keys(doc.byQuestion).find((k) => doc.byQuestion[k] === r) || null,
    })),
  };
  /* rebuild needsImprove with proper ids */
  doc.aggregate.needsImprove = Object.entries(doc.byQuestion)
    .map(([qid, r]) => ({
      questionId: qid,
      patternId: r.patternId || null,
      total: Number(r.qualityScore?.total ?? 0),
    }))
    .filter((r) => r.total < 70)
    .sort((a, b) => a.total - b.total)
    .slice(0, 10);
  doc.aggregate.average = average;
  doc.aggregate.count = rows.length;
  saveSolutionQualityDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadSolutionBlueprintDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_SOLUTION_BLUEPRINT_V1, emptyBlueprint())
    || emptyBlueprint()
  );
}

export function saveSolutionBlueprintDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_SOLUTION_BLUEPRINT_V1,
    touch(doc || emptyBlueprint()),
  );
}

export function persistSolutionBlueprint(questionId, blueprint) {
  const doc = loadSolutionBlueprintDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...blueprint,
    questionId,
    savedAt: new Date().toISOString(),
  };
  saveSolutionBlueprintDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadSolutionReviewDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_SOLUTION_REVIEW_V1, emptyReview())
    || emptyReview()
  );
}

export function saveSolutionReviewDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_SOLUTION_REVIEW_V1,
    touch(doc || emptyReview()),
  );
}

export function persistSolutionReview(questionId, review) {
  const doc = loadSolutionReviewDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...review,
    questionId,
    savedAt: new Date().toISOString(),
  };
  saveSolutionReviewDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadSolutionImprovementDoc() {
  return (
    getItem(STORAGE_KEYS.LEARNING_SOLUTION_IMPROVEMENT_V1, emptyImprovement())
    || emptyImprovement()
  );
}

export function saveSolutionImprovementDoc(doc) {
  return setItem(
    STORAGE_KEYS.LEARNING_SOLUTION_IMPROVEMENT_V1,
    touch(doc || emptyImprovement()),
  );
}

export function persistSolutionImprovement(questionId, improvement) {
  const doc = loadSolutionImprovementDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = {
    ...improvement,
    questionId,
    savedAt: new Date().toISOString(),
  };
  doc.latest = doc.byQuestion[questionId];
  saveSolutionImprovementDoc(doc);
  return doc.byQuestion[questionId];
}

export function getQualityAggregate() {
  return loadSolutionQualityDoc().aggregate || { average: 0, count: 0, needsImprove: [] };
}

export default {
  SOLUTION_QUALITY_SCHEMA,
  loadSolutionQualityDoc,
  persistSolutionQuality,
  loadSolutionBlueprintDoc,
  persistSolutionBlueprint,
  loadSolutionReviewDoc,
  persistSolutionReview,
  loadSolutionImprovementDoc,
  persistSolutionImprovement,
  getQualityAggregate,
};
