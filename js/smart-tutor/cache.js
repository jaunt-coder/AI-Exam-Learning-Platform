/**
 * Sprint-15B — Smart Tutor Storage Cache
 * Additive LocalStorage only. Never writes Question / Pattern / Statistics DB.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const SMART_TUTOR_SCHEMA = 'v1';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptySmartReview() {
  return { schemaVersion: SMART_TUTOR_SCHEMA, byQuestion: {}, latest: null, updatedAt: null };
}

function emptyWeakMemory() {
  return {
    schemaVersion: SMART_TUTOR_SCHEMA,
    byKey: {},
    banners: {},
    updatedAt: null,
  };
}

function emptyFormulaCard() {
  return { schemaVersion: SMART_TUTOR_SCHEMA, byPattern: {}, latest: null, updatedAt: null };
}

function emptyMiniRetry() {
  return { schemaVersion: SMART_TUTOR_SCHEMA, byQuestion: {}, latest: null, updatedAt: null };
}

function emptySmartTutor() {
  return {
    schemaVersion: SMART_TUTOR_SCHEMA,
    byQuestion: {},
    promoteRequests: [],
    latest: null,
    updatedAt: null,
  };
}

export function loadSmartReviewDoc() {
  return getItem(STORAGE_KEYS.LEARNING_SMART_REVIEW_V1, emptySmartReview()) || emptySmartReview();
}

export function saveSmartReviewDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SMART_REVIEW_V1, touch(doc || emptySmartReview()));
}

export function persistSmartReview(questionId, payload) {
  const doc = loadSmartReviewDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = { ...payload, savedAt: new Date().toISOString() };
  doc.latest = doc.byQuestion[questionId];
  saveSmartReviewDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadWeakMemoryDoc() {
  return getItem(STORAGE_KEYS.LEARNING_WEAK_MEMORY_V1, emptyWeakMemory()) || emptyWeakMemory();
}

export function saveWeakMemoryDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_WEAK_MEMORY_V1, touch(doc || emptyWeakMemory()));
}

export function loadFormulaCardDoc() {
  return getItem(STORAGE_KEYS.LEARNING_FORMULA_CARD_V1, emptyFormulaCard()) || emptyFormulaCard();
}

export function saveFormulaCardDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_FORMULA_CARD_V1, touch(doc || emptyFormulaCard()));
}

export function persistFormulaCard(patternId, payload) {
  const doc = loadFormulaCardDoc();
  if (!doc.byPattern) doc.byPattern = {};
  const key = patternId || 'unknown';
  doc.byPattern[key] = { ...payload, savedAt: new Date().toISOString() };
  doc.latest = doc.byPattern[key];
  saveFormulaCardDoc(doc);
  return doc.byPattern[key];
}

export function loadMiniRetryDoc() {
  return getItem(STORAGE_KEYS.LEARNING_MINI_RETRY_V1, emptyMiniRetry()) || emptyMiniRetry();
}

export function saveMiniRetryDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_MINI_RETRY_V1, touch(doc || emptyMiniRetry()));
}

export function persistMiniRetry(questionId, payload) {
  const doc = loadMiniRetryDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = { ...payload, savedAt: new Date().toISOString() };
  doc.latest = doc.byQuestion[questionId];
  saveMiniRetryDoc(doc);
  return doc.byQuestion[questionId];
}

export function loadSmartTutorDoc() {
  return getItem(STORAGE_KEYS.LEARNING_SMART_TUTOR_V1, emptySmartTutor()) || emptySmartTutor();
}

export function saveSmartTutorDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_SMART_TUTOR_V1, touch(doc || emptySmartTutor()));
}

export function persistSmartTutorAdvice(questionId, payload) {
  const doc = loadSmartTutorDoc();
  if (!doc.byQuestion) doc.byQuestion = {};
  doc.byQuestion[questionId] = { ...payload, savedAt: new Date().toISOString() };
  doc.latest = doc.byQuestion[questionId];
  saveSmartTutorDoc(doc);
  return doc.byQuestion[questionId];
}

export function appendPromoteRequest(entry) {
  const doc = loadSmartTutorDoc();
  if (!Array.isArray(doc.promoteRequests)) doc.promoteRequests = [];
  doc.promoteRequests.push({
    ...entry,
    autoPromote: false,
    requestedAt: new Date().toISOString(),
  });
  if (doc.promoteRequests.length > 100) {
    doc.promoteRequests = doc.promoteRequests.slice(-100);
  }
  saveSmartTutorDoc(doc);
  return doc.promoteRequests[doc.promoteRequests.length - 1];
}

export default {
  SMART_TUTOR_SCHEMA,
  loadSmartReviewDoc,
  persistSmartReview,
  loadWeakMemoryDoc,
  saveWeakMemoryDoc,
  loadFormulaCardDoc,
  persistFormulaCard,
  loadMiniRetryDoc,
  persistMiniRetry,
  loadSmartTutorDoc,
  persistSmartTutorAdvice,
  appendPromoteRequest,
};
