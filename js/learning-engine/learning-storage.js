/**
 * Sprint-13B — Learning Engine storage layer
 * Additive keys only. Reads existing mastery/recommendation/weakness via their services.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const LE_KEYS = Object.freeze({
  SCHEDULE: STORAGE_KEYS.LEARNING_SCHEDULE_V1 || 'learning.schedule.v1',
  PROGRESS: STORAGE_KEYS.LEARNING_ENGINE_PROGRESS_V1 || 'learning.engine-progress.v1',
  REVIEW_CYCLE: STORAGE_KEYS.LEARNING_REVIEW_CYCLE_V1 || 'learning.review-cycle.v1',
});

function empty(extra = {}) {
  return { schemaVersion: 'v1', sprint: 'Sprint-13B', updatedAt: null, ...extra };
}

export function loadScheduleDoc() {
  const doc = getItem(LE_KEYS.SCHEDULE, null);
  if (!doc || typeof doc !== 'object') return empty({ items: [] });
  return { ...empty(), ...doc, items: Array.isArray(doc.items) ? doc.items : [] };
}

export function saveScheduleDoc(doc) {
  return setItem(LE_KEYS.SCHEDULE, {
    ...(doc || loadScheduleDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  });
}

export function loadProgressDoc() {
  const doc = getItem(LE_KEYS.PROGRESS, null);
  if (!doc || typeof doc !== 'object') return empty({ byQuestion: {}, byPattern: {}, byChapter: {}, daily: [] });
  return {
    ...empty(),
    ...doc,
    byQuestion: doc.byQuestion || {},
    byPattern: doc.byPattern || {},
    byChapter: doc.byChapter || {},
    daily: Array.isArray(doc.daily) ? doc.daily : [],
  };
}

export function saveProgressDoc(doc) {
  return setItem(LE_KEYS.PROGRESS, {
    ...(doc || loadProgressDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  });
}

export function loadReviewCycleDoc() {
  const doc = getItem(LE_KEYS.REVIEW_CYCLE, null);
  if (!doc || typeof doc !== 'object') return empty({ byQuestion: {} });
  return { ...empty(), ...doc, byQuestion: doc.byQuestion || {} };
}

export function saveReviewCycleDoc(doc) {
  return setItem(LE_KEYS.REVIEW_CYCLE, {
    ...(doc || loadReviewCycleDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  });
}

export default {
  LE_KEYS,
  loadScheduleDoc, saveScheduleDoc,
  loadProgressDoc, saveProgressDoc,
  loadReviewCycleDoc, saveReviewCycleDoc,
};
