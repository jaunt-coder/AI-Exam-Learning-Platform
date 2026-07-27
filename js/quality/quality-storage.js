/**
 * Sprint-12C — Quality storage (additive keys only).
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const QUALITY_KEYS = Object.freeze({
  QUALITY: STORAGE_KEYS.LEARNING_QUALITY_V1 || 'learning.quality.v1',
  HISTORY: STORAGE_KEYS.QUALITY_HISTORY_V1 || 'quality-history.v1',
  REPORT: STORAGE_KEYS.QUALITY_REPORT_V1 || 'quality-report.v1',
});

function emptyQualityDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12C',
    updatedAt: null,
    byQuestion: {},
    aggregate: null,
  };
}

function emptyHistoryDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12C',
    updatedAt: null,
    daily: [],
    weekly: [],
    monthly: [],
  };
}

function emptyReportDoc() {
  return {
    schemaVersion: 'v1',
    sprint: 'Sprint-12C',
    updatedAt: null,
    report: null,
  };
}

export function loadQualityDoc() {
  const doc = getItem(QUALITY_KEYS.QUALITY, null);
  if (!doc || typeof doc !== 'object') return emptyQualityDoc();
  return {
    ...emptyQualityDoc(),
    ...doc,
    byQuestion: doc.byQuestion || {},
  };
}

export function saveQualityDoc(doc) {
  const next = {
    ...(doc || emptyQualityDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(QUALITY_KEYS.QUALITY, next);
}

export function loadQualityHistoryDoc() {
  const doc = getItem(QUALITY_KEYS.HISTORY, null);
  if (!doc || typeof doc !== 'object') return emptyHistoryDoc();
  return {
    ...emptyHistoryDoc(),
    ...doc,
    daily: Array.isArray(doc.daily) ? doc.daily : [],
    weekly: Array.isArray(doc.weekly) ? doc.weekly : [],
    monthly: Array.isArray(doc.monthly) ? doc.monthly : [],
  };
}

export function saveQualityHistoryDoc(doc) {
  const next = {
    ...(doc || emptyHistoryDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(QUALITY_KEYS.HISTORY, next);
}

export function loadQualityReportDoc() {
  const doc = getItem(QUALITY_KEYS.REPORT, null);
  if (!doc || typeof doc !== 'object') return emptyReportDoc();
  return { ...emptyReportDoc(), ...doc };
}

export function saveQualityReportDoc(doc) {
  const next = {
    ...(doc || emptyReportDoc()),
    schemaVersion: 'v1',
    updatedAt: new Date().toISOString(),
  };
  return setItem(QUALITY_KEYS.REPORT, next);
}

export default {
  QUALITY_KEYS,
  loadQualityDoc,
  saveQualityDoc,
  loadQualityHistoryDoc,
  saveQualityHistoryDoc,
  loadQualityReportDoc,
  saveQualityReportDoc,
};
