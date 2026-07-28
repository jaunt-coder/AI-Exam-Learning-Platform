/**
 * Sprint-19B — Subject Detector (Universal)
 * Appraiser default layout is a plugin profile — other exams can register layouts.
 * Never mutates product DBs.
 */

export const SUBJECT_DETECT_VERSION = '19B';

/** @type {Record<string, object>} */
const LAYOUTS = Object.create(null);

/**
 * Default 감정평가사 1차 교시 레이아웃 (profile — not hardcoded forever).
 */
export const APPRAISER_LAYOUT = Object.freeze({
  id: 'appraiser-v1',
  examName: '감정평가사',
  sessions: {
    exam_1: [
      {
        subjectId: 'civil',
        name: '민법',
        markers: ['민법', '民法'],
        // numbers often restart per section; markers take priority
        numberHint: [1, 40],
      },
      {
        subjectId: 'economics',
        name: '경제학',
        markers: ['경제학', '經濟學'],
        numberHint: [1, 40],
      },
      {
        subjectId: 'realestate',
        name: '부동산학',
        markers: ['부동산학원론', '부동산학', '不動産學'],
        numberHint: [1, 40],
      },
    ],
    exam_2: [
      {
        subjectId: 'law',
        name: '관계법규',
        markers: ['감정평가관계법규', '관계법규', '評價關係法規'],
        numberHint: [1, 40],
      },
      {
        subjectId: 'accounting',
        name: '회계학',
        markers: ['회계학', '會計學'],
        numberHint: [41, 80],
      },
    ],
  },
});

export function registerExamLayout(layout) {
  if (!layout?.id) throw new Error('layout.id required');
  LAYOUTS[layout.id] = layout;
  return layout;
}

export function getExamLayout(layoutId = 'appraiser-v1') {
  if (!LAYOUTS[layoutId] && layoutId === 'appraiser-v1') {
    registerExamLayout(APPRAISER_LAYOUT);
  }
  return LAYOUTS[layoutId] || LAYOUTS['appraiser-v1'] || APPRAISER_LAYOUT;
}

registerExamLayout(APPRAISER_LAYOUT);

/**
 * Subjects expected for a session file role.
 * @param {'exam_1'|'exam_2'|string} session
 * @param {string} [layoutId]
 */
export function subjectsForSession(session, layoutId = 'appraiser-v1') {
  const layout = getExamLayout(layoutId);
  const list = layout.sessions?.[session] || [];
  return list.map((s) => ({ ...s }));
}

/**
 * Detect subject sections inside OCR/text of one PDF.
 * @param {string} text
 * @param {'exam_1'|'exam_2'|string} session
 * @param {string} [layoutId]
 */
export function detectSubjectsInText(text, session, layoutId = 'appraiser-v1') {
  const subjects = subjectsForSession(session, layoutId);
  const src = String(text || '');
  const hits = [];

  for (const sub of subjects) {
    let index = -1;
    let matched = null;
    for (const marker of sub.markers || []) {
      const i = src.indexOf(marker);
      if (i >= 0 && (index < 0 || i < index)) {
        index = i;
        matched = marker;
      }
    }
    hits.push({
      subjectId: sub.subjectId,
      name: sub.name,
      marker: matched,
      start: index,
      found: index >= 0,
      numberHint: sub.numberHint || null,
    });
  }

  // If markers missing, keep session order with synthetic offsets
  const foundAny = hits.some((h) => h.found);
  if (!foundAny) {
    return hits.map((h, i) => ({
      ...h,
      start: i * 1000000,
      found: false,
      inferred: true,
    }));
  }

  return hits
    .map((h, i) => (h.found ? h : { ...h, start: Number.MAX_SAFE_INTEGER - (hits.length - i), inferred: true }))
    .sort((a, b) => a.start - b.start);
}

/**
 * Split full text into subject blocks.
 * @param {string} text
 * @param {'exam_1'|'exam_2'|string} session
 * @param {string} [layoutId]
 */
export function splitTextBySubject(text, session, layoutId = 'appraiser-v1') {
  const src = String(text || '');
  const detected = detectSubjectsInText(src, session, layoutId);
  const ordered = [...detected].sort((a, b) => a.start - b.start);
  const blocks = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const cur = ordered[i];
    const start = cur.found ? cur.start : (i === 0 ? 0 : ordered[i - 1].start);
    const end = i + 1 < ordered.length && ordered[i + 1].found
      ? ordered[i + 1].start
      : src.length;
    const sliceStart = cur.found ? cur.start : start;
    blocks.push({
      subjectId: cur.subjectId,
      name: cur.name,
      marker: cur.marker,
      found: cur.found,
      inferred: Boolean(cur.inferred),
      numberHint: cur.numberHint,
      text: src.slice(Math.max(0, sliceStart), Math.max(sliceStart, end)),
      start: sliceStart,
      end,
    });
  }

  return {
    session,
    layoutId,
    subjects: blocks,
    subjectIds: blocks.map((b) => b.subjectId),
    version: SUBJECT_DETECT_VERSION,
  };
}

/**
 * Map subject display name → plugin id (universal aliases).
 * @param {string} name
 */
export function resolveSubjectIdFromName(name) {
  const n = String(name || '').trim();
  if (/회계/.test(n)) return 'accounting';
  if (/경제/.test(n)) return 'economics';
  if (/민법/.test(n)) return 'civil';
  if (/부동산/.test(n)) return 'realestate';
  if (/관계법|법규/.test(n)) return 'law';
  return null;
}

export default {
  SUBJECT_DETECT_VERSION,
  APPRAISER_LAYOUT,
  registerExamLayout,
  getExamLayout,
  subjectsForSession,
  detectSubjectsInText,
  splitTextBySubject,
  resolveSubjectIdFromName,
};
