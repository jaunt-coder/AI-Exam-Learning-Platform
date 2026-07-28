/**
 * Sprint-18A — Personal Textbook tags
 */

import { loadTagDoc, saveTagDoc } from './textbook-storage.js';

export function listTagsForQuestion(questionId) {
  if (!questionId) return [];
  const doc = loadTagDoc();
  const tags = doc.byQuestionId?.[questionId];
  return Array.isArray(tags) ? [...tags] : [];
}

export function listAllTags() {
  const doc = loadTagDoc();
  return Array.isArray(doc.catalog) ? [...doc.catalog] : [];
}

export function addTag(questionId, tag) {
  const label = String(tag || '').trim();
  if (!questionId || !label) return listTagsForQuestion(questionId);
  const doc = loadTagDoc();
  if (!doc.byQuestionId) doc.byQuestionId = {};
  const cur = Array.isArray(doc.byQuestionId[questionId])
    ? doc.byQuestionId[questionId]
    : [];
  if (!cur.includes(label)) cur.push(label);
  doc.byQuestionId[questionId] = cur;
  if (!Array.isArray(doc.catalog)) doc.catalog = [];
  if (!doc.catalog.includes(label)) doc.catalog.push(label);
  saveTagDoc(doc);
  return [...cur];
}

export function removeTag(questionId, tag) {
  const label = String(tag || '').trim();
  if (!questionId || !label) return listTagsForQuestion(questionId);
  const doc = loadTagDoc();
  const cur = Array.isArray(doc.byQuestionId?.[questionId])
    ? doc.byQuestionId[questionId].filter((t) => t !== label)
    : [];
  if (!doc.byQuestionId) doc.byQuestionId = {};
  doc.byQuestionId[questionId] = cur;
  saveTagDoc(doc);
  return [...cur];
}

export function setTags(questionId, tags) {
  if (!questionId) return [];
  const list = (Array.isArray(tags) ? tags : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  const doc = loadTagDoc();
  if (!doc.byQuestionId) doc.byQuestionId = {};
  doc.byQuestionId[questionId] = list;
  if (!Array.isArray(doc.catalog)) doc.catalog = [];
  for (const t of list) {
    if (!doc.catalog.includes(t)) doc.catalog.push(t);
  }
  saveTagDoc(doc);
  return [...list];
}

export default {
  listTagsForQuestion,
  listAllTags,
  addTag,
  removeTag,
  setTags,
};
