/**
 * Sprint-19B — Exam Splitter
 * Splits year folders into exam_1 / exam_2 / answer slots (Universal).
 */

import { classifyExamFile, buildPdfManifestEntry } from './pdf-loader.js';
import { subjectsForSession, splitTextBySubject } from './subject-detector.js';

export const EXAM_SPLITTER_VERSION = '19B';

/**
 * Group file entries for one year folder.
 * @param {{ year: number, files: Array<{ name?: string, path: string, bytes?: number }> }} yearPack
 */
export function splitYearFiles(yearPack = {}) {
  const year = Number(yearPack.year) || null;
  const files = Array.isArray(yearPack.files) ? yearPack.files : [];
  const slots = {
    year,
    exam_1: null,
    exam_2: null,
    answer: null,
    other: [],
  };

  for (const f of files) {
    const name = f.name || String(f.path || '').split(/[/\\]/).pop() || '';
    const role = classifyExamFile(name);
    const entry = buildPdfManifestEntry({
      year,
      role,
      path: f.path,
      ext: name.includes('.') ? name.split('.').pop() : null,
      bytes: f.bytes,
    });
    if (role === 'exam_1' || role === 'exam_2' || role === 'answer') {
      if (!slots[role]) slots[role] = entry;
      else slots.other.push(entry);
    } else {
      slots.other.push(entry);
    }
  }

  return {
    ...slots,
    hasExam1: Boolean(slots.exam_1),
    hasExam2: Boolean(slots.exam_2),
    hasAnswer: Boolean(slots.answer),
    complete: Boolean(slots.exam_1 && slots.exam_2 && slots.answer),
    version: EXAM_SPLITTER_VERSION,
  };
}

/**
 * Expand a session PDF into subject jobs.
 * @param {{
 *   year: number,
 *   session: 'exam_1'|'exam_2',
 *   sourcePath?: string,
 *   text?: string,
 *   layoutId?: string,
 * }} input
 */
export function splitExamSession(input = {}) {
  const session = input.session || 'exam_2';
  const layoutId = input.layoutId || 'appraiser-v1';
  const expected = subjectsForSession(session, layoutId);
  const split = input.text
    ? splitTextBySubject(input.text, session, layoutId)
    : {
        session,
        layoutId,
        subjects: expected.map((s) => ({
          subjectId: s.subjectId,
          name: s.name,
          marker: null,
          found: false,
          inferred: true,
          numberHint: s.numberHint,
          text: '',
          start: 0,
          end: 0,
        })),
        subjectIds: expected.map((s) => s.subjectId),
      };

  return {
    year: Number(input.year) || null,
    session,
    sourcePath: input.sourcePath || null,
    layoutId,
    subjects: split.subjects,
    jobs: split.subjects.map((b) => ({
      year: Number(input.year) || null,
      session,
      subjectId: b.subjectId,
      subjectName: b.name,
      sourcePath: input.sourcePath || null,
      text: b.text || '',
      numberHint: b.numberHint,
      markerFound: Boolean(b.found),
    })),
    version: EXAM_SPLITTER_VERSION,
  };
}

export default {
  EXAM_SPLITTER_VERSION,
  splitYearFiles,
  splitExamSession,
};
