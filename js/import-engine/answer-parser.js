/**
 * Sprint-19B — Answer Parser (Universal)
 * Parses answer keys from text / JSON maps and matches to questions.
 */

export const ANSWER_PARSER_VERSION = '19B';

const CIRCLE = {
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
  '❶': 1, '❷': 2, '❸': 3, '❹': 4, '❺': 5,
};

/**
 * Parse answer map from free text.
 * Accepts: "41. ③", "41-3", "41 3", JSON-like lines.
 * @param {string} text
 * @returns {Record<number, number>}
 */
export function parseAnswerText(text) {
  const src = String(text || '');
  /** @type {Record<number, number>} */
  const map = {};

  const re = /(\d{1,3})\s*[\.．:\-–—)]?\s*([①②③④⑤❶❷❸❹❺1-5])/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const num = Number(m[1]);
    const raw = m[2];
    const ans = CIRCLE[raw] || Number(raw);
    if (Number.isFinite(num) && ans >= 1 && ans <= 5) {
      map[num] = ans;
    }
  }

  return map;
}

/**
 * Parse answer JSON object { "41": 3, ... }.
 * @param {object|string} payload
 */
export function parseAnswerJson(payload) {
  const obj = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
  /** @type {Record<number, number>} */
  const map = {};
  for (const [k, v] of Object.entries(obj)) {
    if (String(k).startsWith('_')) continue;
    const num = Number(k);
    const ans = Number(v);
    if (Number.isFinite(num) && ans >= 1 && ans <= 5) map[num] = ans;
  }
  return map;
}

/**
 * Merge answer sources (later overrides earlier).
 * @param {...Record<number, number>} maps
 */
export function mergeAnswerMaps(...maps) {
  const out = {};
  for (const m of maps) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) out[Number(k)] = Number(v);
  }
  return out;
}

/**
 * Match answers onto parsed questions.
 * @param {Array<{ number: number }>} questions
 * @param {Record<number, number>} answerMap
 */
export function matchAnswers(questions = [], answerMap = {}) {
  let matched = 0;
  let missing = 0;
  const result = (questions || []).map((q) => {
    const answer = answerMap[q.number] ?? null;
    if (answer != null) matched += 1;
    else missing += 1;
    return {
      ...q,
      answer,
      answerMatched: answer != null,
    };
  });
  return {
    questions: result,
    matched,
    missing,
    matchRate: result.length ? matched / result.length : 0,
    version: ANSWER_PARSER_VERSION,
  };
}

export default {
  ANSWER_PARSER_VERSION,
  parseAnswerText,
  parseAnswerJson,
  mergeAnswerMaps,
  matchAnswers,
};
