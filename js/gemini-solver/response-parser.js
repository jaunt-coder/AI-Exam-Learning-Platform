/**
 * Sprint-17C — Gemini JSON Response Parser (Human-Level schema)
 * Maps 17C fields and keeps 17A legacy aliases for UI compatibility.
 */

/** Sprint-17C primary required keys */
const REQUIRED_KEYS = [
  'summary',
  'thinkingOrder',
  'calculation',
  'whyAnswer',
  'whyOthersWrong',
  'formula',
  'memoryHack',
  'examTip',
  'correctAnswer',
  'verification',
  'confidence',
];

function extractJsonBlock(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.startsWith('{') && raw.endsWith('}')) return raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return null;
}

function asStringList(value) {
  if (Array.isArray(value)) {
    return value.map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') {
        return String(s.body ?? s.line ?? s.text ?? s.title ?? s.label ?? '');
      }
      return String(s ?? '');
    }).filter((s) => s.length > 0 || true);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/**
 * @param {string} text
 */
export function parseGeminiJson(text) {
  const block = extractJsonBlock(text);
  if (!block) return { ok: false, error: 'no_json_block' };
  try {
    const data = JSON.parse(block);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, error: 'json_not_object' };
    }
    return { ok: true, data: normalizeGeminiPayload(data) };
  } catch (err) {
    return { ok: false, error: 'json_parse_error', detail: err?.message || String(err) };
  }
}

/**
 * Normalize 17C Human-Level payload (+ 17A aliases).
 * @param {object} raw
 */
export function normalizeGeminiPayload(raw = {}) {
  const verification =
    raw.verification && typeof raw.verification === 'object'
      ? {
          choiceMatched: Boolean(raw.verification.choiceMatched),
          calculationCorrect: Boolean(raw.verification.calculationCorrect),
        }
      : { choiceMatched: false, calculationCorrect: false };

  const thinkingOrder = asStringList(
    raw.thinkingOrder?.length ? raw.thinkingOrder : raw.stepByStep,
  );
  const calculation = asStringList(raw.calculation);
  const whyAnswer = asStringList(raw.whyAnswer);
  const whyOthersWrong = asStringList(raw.whyOthersWrong);
  const formula = asStringList(
    raw.formula?.length ? raw.formula : raw.formulaCard ? [raw.formulaCard] : [],
  );
  const memoryHack = asStringList(
    raw.memoryHack?.length ? raw.memoryHack : raw.review30 ? [raw.review30] : [],
  );
  const examTip = asStringList(
    raw.examTip?.length ? raw.examTip : raw.examChecklist,
  );

  const summary = String(raw.summary ?? '');
  const mistakeDiagnosis = String(
    raw.mistakeDiagnosis
      ?? whyOthersWrong.join(' / ')
      ?? '',
  );
  const misconception = String(raw.misconception ?? whyOthersWrong[0] ?? '');

  return {
    /* 17C primary */
    summary,
    thinkingOrder,
    calculation,
    whyAnswer,
    whyOthersWrong,
    formula,
    memoryHack,
    examTip,
    correctAnswer: Number(raw.correctAnswer),
    verification,
    confidence: clampConfidence(raw.confidence),
    humanLevel: true,
    schemaVersion: '17C',
    /* 17A legacy aliases (UI / builders) */
    stepByStep: thinkingOrder.length ? thinkingOrder : asStringList(raw.stepByStep),
    mistakeDiagnosis,
    misconception,
    review30: memoryHack.join('\n') || String(raw.review30 ?? ''),
    formulaCard: formula.join(' → ') || String(raw.formulaCard ?? ''),
    examChecklist: examTip,
    tutorAdvice: String(
      raw.tutorAdvice
      ?? whyAnswer.join(' ')
      ?? summary,
    ),
  };
}

function clampConfidence(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {object} base
 * @param {object} fragment
 * @param {string[]} missingFields
 */
export function mergeMissingFragment(base, fragment, missingFields = []) {
  const next = { ...normalizeGeminiPayload(base) };
  const frag = fragment && typeof fragment === 'object' ? fragment : {};
  const keys = missingFields.length ? missingFields : Object.keys(frag);
  keys.forEach((key) => {
    if (!(key in frag)) return;
    if (key === 'verification' && frag.verification && typeof frag.verification === 'object') {
      next.verification = {
        ...next.verification,
        ...frag.verification,
      };
      return;
    }
    next[key] = frag[key];
  });
  return normalizeGeminiPayload(next);
}

/**
 * Convert Human-Level JSON → Reviewer Markdown (edit surface).
 * @param {object} payload
 */
export function payloadToMarkdown(payload = {}) {
  const p = normalizeGeminiPayload(payload);
  const lines = [
    `# 요약`,
    p.summary || '',
    '',
    `# 문제 접근 순서`,
    ...p.thinkingOrder.map((s, i) => `${i + 1}. ${s}`),
    '',
    `# 단계별 계산`,
    ...p.calculation.map((s) => `- ${s}`),
    '',
    `# 정답이 되는 이유`,
    ...p.whyAnswer.map((s, i) => `${i + 1}. ${s}`),
    '',
    `# 다른 선택지가 틀린 이유`,
    ...p.whyOthersWrong.map((s) => `- ${s}`),
    '',
    `# 공식`,
    ...p.formula.map((s) => `- ${s}`),
    '',
    `# 30초 암기`,
    ...p.memoryHack.map((s) => `- ${s}`),
    '',
    `# 시험장 풀이법`,
    ...p.examTip.map((s, i) => `${i + 1}. ${s}`),
  ];
  return lines.join('\n').trim();
}

/**
 * Parse Reviewer Markdown back into payload fields (best-effort).
 * @param {string} markdown
 * @param {object} [base]
 */
export function markdownToPayload(markdown, base = {}) {
  const text = String(markdown || '');
  const sections = {
    summary: [],
    thinkingOrder: [],
    calculation: [],
    whyAnswer: [],
    whyOthersWrong: [],
    formula: [],
    memoryHack: [],
    examTip: [],
  };
  let current = 'summary';
  const map = [
    [/#\s*요약/i, 'summary'],
    [/#\s*문제 접근 순서/i, 'thinkingOrder'],
    [/#\s*단계별 계산/i, 'calculation'],
    [/#\s*정답이 되는 이유/i, 'whyAnswer'],
    [/#\s*다른 선택지가 틀린 이유/i, 'whyOthersWrong'],
    [/#\s*공식/i, 'formula'],
    [/#\s*30초 암기/i, 'memoryHack'],
    [/#\s*시험장 풀이법/i, 'examTip'],
  ];

  text.split(/\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw) return;
    for (const [re, key] of map) {
      if (re.test(raw)) {
        current = key;
        return;
      }
    }
    const cleaned = raw.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (!cleaned) return;
    if (!sections[current]) sections[current] = [];
    sections[current].push(cleaned);
  });

  return normalizeGeminiPayload({
    ...base,
    summary: sections.summary.join(' ') || base.summary,
    thinkingOrder: sections.thinkingOrder.length ? sections.thinkingOrder : base.thinkingOrder,
    calculation: sections.calculation.length ? sections.calculation : base.calculation,
    whyAnswer: sections.whyAnswer.length ? sections.whyAnswer : base.whyAnswer,
    whyOthersWrong: sections.whyOthersWrong.length ? sections.whyOthersWrong : base.whyOthersWrong,
    formula: sections.formula.length ? sections.formula : base.formula,
    memoryHack: sections.memoryHack.length ? sections.memoryHack : base.memoryHack,
    examTip: sections.examTip.length ? sections.examTip : base.examTip,
    correctAnswer: base.correctAnswer,
    verification: base.verification,
    confidence: base.confidence,
  });
}

export { REQUIRED_KEYS };

export default {
  parseGeminiJson,
  normalizeGeminiPayload,
  mergeMissingFragment,
  payloadToMarkdown,
  markdownToPayload,
  REQUIRED_KEYS,
};
