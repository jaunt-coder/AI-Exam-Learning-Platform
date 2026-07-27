/**
 * Sprint-12A — Reviewer Mode storage (additive keys only).
 * Never writes Question / Pattern / Master DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const REVIEW_STORAGE_KEYS = Object.freeze({
  LEARNING_REVIEW_V1: STORAGE_KEYS.LEARNING_REVIEW_V1 || 'learning.review.v1',
  QUESTION_OVERRIDES_V1:
    STORAGE_KEYS.QUESTION_OVERRIDES_V1 || 'question-overrides.v1',
  REVIEW_HISTORY_V1: STORAGE_KEYS.REVIEW_HISTORY_V1 || 'review-history.v1',
});

export const REVIEW_STATUSES = Object.freeze([
  'NOT_REVIEWED',
  'REVIEWED',
  'NEEDS_VERIFY',
  'APPROVED',
  'REJECTED',
]);

export const REVIEW_FLAGS = Object.freeze([
  'HUMAN_REVIEW',
  'OCR_ERROR',
  'NEED_VERIFICATION',
  'PATTERN_MISMATCH',
  'CALCULATION_ERROR',
  'TABLE_ERROR',
  'ANSWER_SUSPECTED',
  'TABLE_FIXED',
  'CHOICE_FIXED',
  'TEXT_FIXED',
  'SOLUTION_FIXED',
  'PATTERN_FIXED',
]);

function emptyReviewDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12A',
    updatedAt: null,
    byQuestion: {},
  };
}

function emptyOverridesDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12A',
    updatedAt: null,
    overrides: {},
  };
}

function emptyHistoryDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12A',
    updatedAt: null,
    byQuestion: {},
  };
}

export function loadReviewDoc() {
  const doc = getItem(REVIEW_STORAGE_KEYS.LEARNING_REVIEW_V1, null);
  if (!doc || typeof doc !== 'object') return emptyReviewDoc();
  if (!doc.byQuestion || typeof doc.byQuestion !== 'object') {
    return { ...emptyReviewDoc(), ...doc, byQuestion: {} };
  }
  return doc;
}

export function saveReviewDoc(doc) {
  const next = {
    ...(doc || emptyReviewDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(REVIEW_STORAGE_KEYS.LEARNING_REVIEW_V1, next);
}

export function loadOverridesDoc() {
  const doc = getItem(REVIEW_STORAGE_KEYS.QUESTION_OVERRIDES_V1, null);
  if (!doc || typeof doc !== 'object') return emptyOverridesDoc();
  if (!doc.overrides || typeof doc.overrides !== 'object') {
    return { ...emptyOverridesDoc(), ...doc, overrides: {} };
  }
  return doc;
}

export function saveOverridesDoc(doc) {
  const next = {
    ...(doc || emptyOverridesDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(REVIEW_STORAGE_KEYS.QUESTION_OVERRIDES_V1, next);
}

export function loadHistoryDoc() {
  const doc = getItem(REVIEW_STORAGE_KEYS.REVIEW_HISTORY_V1, null);
  if (!doc || typeof doc !== 'object') return emptyHistoryDoc();
  if (!doc.byQuestion || typeof doc.byQuestion !== 'object') {
    return { ...emptyHistoryDoc(), ...doc, byQuestion: {} };
  }
  return doc;
}

export function saveHistoryDoc(doc) {
  const next = {
    ...(doc || emptyHistoryDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(REVIEW_STORAGE_KEYS.REVIEW_HISTORY_V1, next);
}

export function exportOverridesJson() {
  return JSON.stringify(loadOverridesDoc(), null, 2);
}

export function importOverridesJson(raw) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_err) {
    return { ok: false, error: 'invalid_json' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid_object' };
  }
  const overrides =
    parsed.overrides && typeof parsed.overrides === 'object'
      ? parsed.overrides
      : parsed;
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return { ok: false, error: 'invalid_overrides' };
  }
  const doc = {
    schemaVersion: 'v1',
    sprint: 'Sprint-12A',
    updatedAt: new Date().toISOString(),
    overrides,
  };
  saveOverridesDoc(doc);
  return { ok: true, count: Object.keys(overrides).length, doc };
}

export default {
  REVIEW_STORAGE_KEYS,
  REVIEW_STATUSES,
  REVIEW_FLAGS,
  loadReviewDoc,
  saveReviewDoc,
  loadOverridesDoc,
  saveOverridesDoc,
  loadHistoryDoc,
  saveHistoryDoc,
  exportOverridesJson,
  importOverridesJson,
};
