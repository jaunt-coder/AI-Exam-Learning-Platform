/**
 * Sprint-09H-4 — Approved Solution Content Layer (runtime overlay)
 * Read-only fetch of data/question-solution-approved.json.
 * Does not mutate Question / Answer / Pattern / Mapping / Solution Content.
 */

const APPROVED_PATH = 'data/question-solution-approved.json';
const PHASE1_QUESTIONS_PATH = 'data/question-db.json';

/**
 * Runtime ID bridge only (not Mapping SoT).
 * Learning Loop golden IDs → Phase1 / approved overlay IDs.
 */
const RUNTIME_SOLUTION_ALIASES = Object.freeze({
  ACC_2018_Q042: 'ACC_INV_Q001',
});

/** @type {Map<string, object>|null} */
let byQuestionId = null;
/** @type {Promise<Map<string, object>>|null} */
let loadPromise = null;

/**
 * @param {string} path
 * @returns {Promise<any>}
 */
async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

/**
 * Canonical overlay key for a runtime questionId.
 * @param {string|null|undefined} questionId
 * @returns {string|null}
 */
export function resolveOverlayQuestionId(questionId) {
  if (!questionId || typeof questionId !== 'string') return null;
  return RUNTIME_SOLUTION_ALIASES[questionId] || questionId;
}

/**
 * Load and cache approved solution index.
 * @returns {Promise<Map<string, object>>}
 */
export async function loadSolutionOverlay() {
  if (byQuestionId) return byQuestionId;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const map = new Map();
    try {
      const data = await fetchJson(APPROVED_PATH);
      for (const row of data.questions || []) {
        if (!row?.questionId || !row.solution) continue;
        if (row.solution.reviewStatus !== 'APPROVED') continue;
        map.set(row.questionId, row);
      }
    } catch (err) {
      console.warn(
        '[solution-overlay] approved layer unavailable — Pattern fallback only:',
        err?.message || err
      );
    }
    byQuestionId = map;
    return map;
  })();

  return loadPromise;
}

/**
 * @param {string|null|undefined} questionId
 * @returns {object|null} approved solution object or null
 */
export function getApprovedSolution(questionId) {
  if (!byQuestionId) return null;
  const key = resolveOverlayQuestionId(questionId);
  if (!key) return null;
  const row = byQuestionId.get(key);
  return row?.solution || null;
}

/**
 * @param {string|null|undefined} questionId
 * @returns {object|null} full overlay row
 */
export function getApprovedOverlayRow(questionId) {
  if (!byQuestionId) return null;
  const key = resolveOverlayQuestionId(questionId);
  if (!key) return null;
  return byQuestionId.get(key) || null;
}

/**
 * Append Phase1 questions that have APPROVED overlay but are absent from the
 * golden study pack (after alias resolution). Read-only Question DB fetch.
 *
 * @param {object[]} studyQuestions from loadStudyBundle()
 * @returns {Promise<object[]>}
 */
export async function enrichStudyQuestionsWithApproved(studyQuestions = []) {
  const overlay = await loadSolutionOverlay();
  if (!overlay.size) return studyQuestions.slice();

  const presentKeys = new Set();
  for (const q of studyQuestions) {
    const id = q?.questionId;
    if (!id) continue;
    presentKeys.add(id);
    presentKeys.add(resolveOverlayQuestionId(id));
  }

  const missingIds = [...overlay.keys()].filter((id) => !presentKeys.has(id));
  if (!missingIds.length) return studyQuestions.slice();

  let phase1 = [];
  try {
    phase1 = await fetchJson(PHASE1_QUESTIONS_PATH);
  } catch (err) {
    console.warn(
      '[solution-overlay] phase1 question-db unavailable for enrich:',
      err?.message || err
    );
    return studyQuestions.slice();
  }

  const phase1ById = new Map(
    (Array.isArray(phase1) ? phase1 : []).map((q) => [q.questionId, q])
  );

  const extras = [];
  for (const id of missingIds) {
    const row = overlay.get(id);
    const q = phase1ById.get(id);
    if (!row || !q) continue;
    const patternId = row.patternId || q.patternId;
    if (!patternId) continue;
    extras.push({
      questionId: q.questionId,
      number: null,
      year: q.year,
      stem: q.originalQuestion || q.question || '',
      choices: Array.isArray(q.choices) ? q.choices.slice() : [],
      answer: q.answer,
      sourcePath: PHASE1_QUESTIONS_PATH,
      mapping: {
        mapping_status: 'mapped',
        pattern_id: patternId,
        source: 'solution-overlay-runtime',
        note: 'Runtime bridge for Approved Solution Review — Mapping SoT untouched',
      },
      fromSolutionOverlay: true,
    });
  }

  return studyQuestions.concat(extras);
}

export function getRuntimeSolutionAliases() {
  return { ...RUNTIME_SOLUTION_ALIASES };
}

export default {
  loadSolutionOverlay,
  getApprovedSolution,
  getApprovedOverlayRow,
  resolveOverlayQuestionId,
  enrichStudyQuestionsWithApproved,
  getRuntimeSolutionAliases,
};
