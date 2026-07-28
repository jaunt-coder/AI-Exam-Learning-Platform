/**
 * Sprint-19C — ROI Storage
 * Additive LocalStorage only.
 */

import { getItem, setItem, STORAGE_KEYS } from '../storage.js';

export const ROI_STORAGE_VERSION = '19C';

function touch(doc) {
  doc.updatedAt = new Date().toISOString();
  return doc;
}

function emptyRoi() {
  return {
    schemaVersion: 'v1',
    bySubject: {},
    top10: [],
    todayMission: null,
    weekMission: null,
    updatedAt: null,
  };
}

function emptyPass60() {
  return {
    schemaVersion: 'v1',
    bySubject: {},
    updatedAt: null,
  };
}

function emptyPatternMap() {
  return {
    schemaVersion: 'v1',
    bySubject: {},
    heatmap: null,
    updatedAt: null,
  };
}

function emptyPriority() {
  return {
    schemaVersion: 'v1',
    bySubject: {},
    updatedAt: null,
  };
}

export function loadRoiDoc() {
  return getItem(STORAGE_KEYS.LEARNING_ROI_V1, emptyRoi()) || emptyRoi();
}

export function saveRoiDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_ROI_V1, touch(doc || emptyRoi()));
}

export function loadPass60Doc() {
  return getItem(STORAGE_KEYS.LEARNING_PASS60_V1, emptyPass60()) || emptyPass60();
}

export function savePass60Doc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_PASS60_V1, touch(doc || emptyPass60()));
}

export function loadPatternMapDoc() {
  return getItem(STORAGE_KEYS.LEARNING_PATTERN_MAP_V1, emptyPatternMap()) || emptyPatternMap();
}

export function savePatternMapDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_PATTERN_MAP_V1, touch(doc || emptyPatternMap()));
}

export function loadPatternPriorityDoc() {
  return getItem(STORAGE_KEYS.LEARNING_PATTERN_PRIORITY_V1, emptyPriority()) || emptyPriority();
}

export function savePatternPriorityDoc(doc) {
  return setItem(STORAGE_KEYS.LEARNING_PATTERN_PRIORITY_V1, touch(doc || emptyPriority()));
}

export default {
  ROI_STORAGE_VERSION,
  loadRoiDoc,
  saveRoiDoc,
  loadPass60Doc,
  savePass60Doc,
  loadPatternMapDoc,
  savePatternMapDoc,
  loadPatternPriorityDoc,
  savePatternPriorityDoc,
};
