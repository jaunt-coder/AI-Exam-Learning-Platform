/**
 * Sprint-13A — Student exam / learning session (Resolved Snapshot)
 * Exam Runtime is not modified; UI stores frozen snapshots here.
 */

import {
  questionResolver,
  toStudentQuestion,
} from './student-resolver.js';
import { resolveQuestion } from '../reviewer/override-service.js';
import {
  loadStudentSessionDoc,
  saveStudentSessionDoc,
} from './student-storage.js';

/**
 * Freeze resolved questions at exam start. Mid-exam overrides must not apply.
 * @param {string} examSessionId
 * @param {object[]} originalQuestions — DB originals for selected IDs
 */
export function createExamResolvedSnapshot(examSessionId, originalQuestions = []) {
  const sid = String(examSessionId || '');
  if (!sid) return { ok: false, error: 'missing_sessionId' };

  const questions = (Array.isArray(originalQuestions) ? originalQuestions : []).map(
    (q) => {
      const student = questionResolver(q, { useCache: false });
      return {
        ...student,
        _snapshotAt: new Date().toISOString(),
        _snapshotFrozen: true,
      };
    },
  );

  const byId = {};
  for (const q of questions) {
    byId[q.questionId] = q;
  }

  const doc = loadStudentSessionDoc();
  doc.examSnapshots[sid] = {
    sessionId: sid,
    createdAt: new Date().toISOString(),
    questionIds: questions.map((q) => q.questionId),
    byId,
    questions,
  };
  doc.lastExamSessionId = sid;
  saveStudentSessionDoc(doc);

  return { ok: true, snapshot: doc.examSnapshots[sid] };
}

export function getExamResolvedSnapshot(examSessionId) {
  const doc = loadStudentSessionDoc();
  return doc.examSnapshots?.[examSessionId] || null;
}

export function getExamSnapshotQuestion(examSessionId, questionId) {
  const snap = getExamResolvedSnapshot(examSessionId);
  if (!snap) return null;
  return snap.byId?.[questionId] || null;
}

export function getExamSnapshotQuestions(examSessionId) {
  const snap = getExamResolvedSnapshot(examSessionId);
  return snap?.questions?.slice() || [];
}

/**
 * After exam: compare frozen snapshot vs latest Override resolve.
 * @param {string} examSessionId
 * @param {object[]} originals — current DB originals
 */
export function compareExamSnapshotWithLatest(examSessionId, originals = []) {
  const snap = getExamResolvedSnapshot(examSessionId);
  if (!snap) return { ok: false, error: 'no_snapshot', diffs: [] };

  const originalMap = Object.fromEntries(
    (originals || []).map((q) => [q.questionId || q.id, q]),
  );
  const diffs = [];

  for (const qid of snap.questionIds || []) {
    const frozen = snap.byId[qid];
    const original = originalMap[qid];
    if (!frozen || !original) continue;
    const latest = toStudentQuestion(resolveQuestion(original));
    const fields = ['question', 'table', 'choices', 'patternId', 'answer'];
    const changed = [];
    for (const f of fields) {
      const a = JSON.stringify(frozen[f] ?? null);
      const b = JSON.stringify(latest[f] ?? null);
      if (a !== b) changed.push(f);
    }
    if (changed.length) {
      diffs.push({
        questionId: qid,
        changedFields: changed,
        snapshot: frozen,
        latest,
      });
    }
  }

  return {
    ok: true,
    sessionId: examSessionId,
    comparedAt: new Date().toISOString(),
    diffCount: diffs.length,
    diffs,
  };
}

export default {
  createExamResolvedSnapshot,
  getExamResolvedSnapshot,
  getExamSnapshotQuestion,
  getExamSnapshotQuestions,
  compareExamSnapshotWithLatest,
};
