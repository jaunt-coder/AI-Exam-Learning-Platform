/**
 * M2 study data loader — read-only fetches of verified assets.
 * Never mutates Question / Answer / Pattern SoT files.
 */

const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/**
 * @param {number} n 1-based
 * @returns {string}
 */
export function choiceLabel(n) {
  return CIRCLE[n - 1] || String(n);
}

/**
 * Load Golden pilot study set Q41–Q80 + mapping + pattern DBs.
 */
export async function loadStudyBundle() {
  const [mapping, master, metadata] = await Promise.all([
    fetchJson('data/golden-pattern-mapping.json'),
    fetchJson('data/pattern-master-db.json'),
    fetchJson('data/pattern-metadata-db.json'),
  ]);

  const mapById = new Map(
    (mapping.mappings || []).map((m) => [m.question_id, m])
  );
  const masterById = new Map(
    (master.patterns || []).map((p) => [p.pattern_id, p])
  );
  const metaById = new Map(
    (metadata.patterns || []).map((p) => [p.pattern_id, p])
  );

  const questionIds = [];
  for (let n = 41; n <= 80; n += 1) {
    questionIds.push(`ACC_2018_Q${String(n).padStart(3, '0')}`);
  }

  const questions = [];
  for (const qid of questionIds) {
    const path = `data/knowledge/pilot/2018/candidate/${qid}.json`;
    const data = await fetchJson(path);
    const map = mapById.get(qid) || null;
    questions.push({
      questionId: data.questionId || qid,
      number: data.number,
      year: data.year,
      stem: data.stem,
      choices: Array.isArray(data.choices) ? data.choices : [],
      answer: data.answer,
      sourcePath: path,
      mapping: map,
    });
  }

  return {
    questions,
    mapping,
    master,
    metadata,
    masterById,
    metaById,
  };
}

/**
 * Verified pattern card model (null if not displayable).
 * @param {object|null} mappingRow
 * @param {Map} masterById
 * @param {Map} metaById
 */
export function buildPatternCard(mappingRow, masterById, metaById) {
  if (!mappingRow || mappingRow.mapping_status !== 'mapped' || !mappingRow.pattern_id) {
    return {
      visible: false,
      reason: 'verified_pattern_not_mapped',
    };
  }
  const pid = mappingRow.pattern_id;
  const master = masterById.get(pid);
  const meta = metaById.get(pid);
  if (!master || master.validation_status !== 'verified') {
    return { visible: false, reason: 'pattern_not_verified' };
  }

  const concept = meta?.concept;
  const conceptOk =
    concept &&
    (concept.status === 'documented' || concept.status === 'evidenced') &&
    concept.value;

  const algo = meta?.solving_algorithm;
  // Spec says "documented"; DB uses "evidenced" for verified steps — both allowed.
  const algoOk =
    algo &&
    (algo.status === 'documented' || algo.status === 'evidenced') &&
    Array.isArray(algo.steps) &&
    algo.steps.length > 0;

  return {
    visible: true,
    pattern_id: pid,
    name: master.name || meta?.name || pid,
    grade: meta?.grade ?? master.importance_grade ?? master.grade ?? null,
    validation_status: master.validation_status,
    concept: conceptOk
      ? { status: concept.status, value: concept.value }
      : { status: 'pending', value: null },
    solving_algorithm: algoOk
      ? { status: algo.status, steps: algo.steps.slice() }
      : { status: 'pending', steps: [] },
  };
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

export default {
  loadStudyBundle,
  buildPatternCard,
  choiceLabel,
};
