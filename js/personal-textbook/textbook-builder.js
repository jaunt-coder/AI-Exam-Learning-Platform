/**
 * Sprint-18A — Build Personal Textbook entries / summaries / weak collections
 * Does not mutate Learning Engine formulas or DB files.
 */

import { loadMasteryState } from '../mastery-service.js';

export const TEXTBOOK_BUILDER_VERSION = '18A';

function asArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v == null || v === '') return [];
  return [String(v)];
}

function nowParts(date = new Date()) {
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 19),
    at: iso,
  };
}

function resolveMastery(patternId) {
  if (!patternId) return null;
  try {
    const state = loadMasteryState();
    const list = Array.isArray(state?.patterns) ? state.patterns : [];
    const row = list.find((p) => p.patternId === patternId || p.pattern_id === patternId);
    if (!row) return null;
    if (typeof row.score === 'number') return row.score;
    if (typeof row.mastery === 'number') return row.mastery;
    if (typeof row.accuracy === 'number') return Math.round(row.accuracy * 100);
    return row.level || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Build one textbook page entry from a solve Result pack.
 */
export function buildTextbookEntry(ctx = {}) {
  const question = ctx.question || {};
  const pattern = ctx.pattern || null;
  const grade = ctx.grade || {};
  const pack = ctx.pack || {};
  const gemini = pack.geminiNative || ctx.gemini || null;
  const stamp = nowParts(ctx.now ? new Date(ctx.now) : new Date());

  const questionId = question.questionId || pack.questionId || null;
  const patternId = question.patternId || pattern?.patternId || pack.result?.patternId || null;
  const chapter =
    question.chapter
    || pattern?.chapter
    || pattern?.chapterName
    || pack.result?.chapter
    || null;

  const isCorrect = Boolean(
    grade.isCorrect
    ?? grade.correct
    ?? pack.result?.isCorrect
    ?? false,
  );

  const calculation = asArray(
    gemini?.calculation
    || pack.calculation
    || gemini?.payload?.calculation,
  );
  const thinkingOrder = asArray(
    pack.thinkingOrder
    || gemini?.thinkingOrder
    || gemini?.payload?.thinkingOrder,
  );
  const whyOthersWrong = asArray(
    pack.whyOthersWrong
    || gemini?.whyOthersWrong
    || gemini?.payload?.whyOthersWrong,
  );
  const formula = asArray(
    pack.formulaHuman
    || gemini?.formula
    || gemini?.payload?.formula
    || pack.formulas?.map?.((f) => f.formula || f.text || f)
    || [],
  );
  const memoryHack = asArray(
    pack.memoryHack
    || gemini?.memoryHack
    || gemini?.payload?.memoryHack,
  );
  const examTip = asArray(
    pack.examTipHuman
    || gemini?.examTip
    || gemini?.payload?.examTip,
  );

  const explanation =
    gemini?.explanation
    || pack.explanation
    || gemini?.smartExplanation
    || pack.smartReview?.explanation
    || gemini?.summary
    || pack.summary
    || '';

  const professorExplanation = gemini?.professorLevel || pack.professorLevel
    ? {
        problemUnderstanding:
          pack.problemUnderstanding
          || gemini?.problemUnderstanding
          || gemini?.payload?.problemUnderstanding
          || null,
        coreConcept:
          pack.coreConcept
          || gemini?.coreConcept
          || gemini?.payload?.coreConcept
          || null,
        appliedTheory:
          pack.appliedTheory
          || gemini?.appliedTheory
          || gemini?.payload?.appliedTheory
          || null,
        thinkingOrder,
        solution: gemini?.solution || gemini?.payload?.solution || null,
        choiceAnalysis:
          pack.choiceAnalysis
          || gemini?.choiceAnalysis
          || gemini?.payload?.choiceAnalysis
          || [],
        calculation,
        formula,
        memoryHack,
        examTip,
        tutorMessage:
          pack.tutorMessage
          || gemini?.tutorMessage
          || gemini?.payload?.tutorMessage
          || null,
        qualityScore:
          pack.geminiMeta?.qualityScore
          ?? gemini?.qualityScore
          ?? gemini?.quality?.score
          ?? null,
        markdown: gemini?.markdown || pack.geminiMarkdown || null,
      }
    : null;

  const subjectId =
    ctx.subjectId
    || question.subjectPluginId
    || pack.subjectId
    || null;

  return {
    id: `tb-${questionId || 'unknown'}-${stamp.at}`,
    subjectId,
    questionId,
    patternId,
    patternName: pattern?.name || pack.result?.patternName || patternId,
    chapter,
    mastery: resolveMastery(patternId),
    difficulty: question.difficulty || pack.result?.difficulty || null,
    correct: isCorrect,
    date: stamp.date,
    time: stamp.time,
    at: stamp.at,
    geminiExplanation: explanation,
    professorExplanation,
    calculation,
    thinkingOrder,
    whyOthersWrong,
    formula,
    memoryHack,
    examTip,
    coreConcept: professorExplanation?.coreConcept || null,
    mistakeDiagnosis:
      pack.diagnosis?.primary?.label
      || pack.diagnosis?.primary?.code
      || pack.diagnosis?.summary
      || null,
    tutorAdvice:
      pack.tutorMessage
      || pack.tutor?.advice
      || pack.tutor?.message
      || pack.examTutor?.message
      || null,
    prescription:
      pack.prescription?.summary
      || pack.prescription?.message
      || (Array.isArray(pack.prescription?.actions)
        ? pack.prescription.actions.join(' / ')
        : null),
    confidence:
      pack.geminiMeta?.confidence
      ?? gemini?.confidence
      ?? pack.solutionQuality?.score
      ?? null,
    qualityScore:
      pack.geminiMeta?.qualityScore
      ?? gemini?.qualityScore
      ?? null,
    bookmarked: false,
    tags: [],
    source: professorExplanation
      ? 'professor-explanation'
      : gemini
        ? 'gemini-native'
        : 'smart-tutor',
    schemaVersion: TEXTBOOK_BUILDER_VERSION,
  };
}

/**
 * Pattern summary after ≥3 solves. Improves existing text; never deletes history.
 */
export function buildPatternSummary(patternId, entries = [], prev = null) {
  const list = (entries || []).filter((e) => e.patternId === patternId);
  if (list.length < 3) return null;

  const wrongs = list.filter((e) => !e.correct);
  const patternName = list[0]?.patternName || patternId;
  const formulas = [...new Set(list.flatMap((e) => asArray(e.formula)))].slice(0, 5);
  const tips = [...new Set(list.flatMap((e) => asArray(e.examTip)))].slice(0, 3);
  const mistakes = [...new Set(wrongs.map((e) => e.mistakeDiagnosis).filter(Boolean))].slice(0, 5);

  const body = [
    `${patternName} Pattern을 ${list.length}문제 학습했습니다.`,
    wrongs.length
      ? `최근 ${list.length}문제 중 ${wrongs.length}문제를 틀렸습니다.`
      : `최근 ${list.length}문제를 모두 맞혔습니다.`,
    formulas.length ? `핵심 공식: ${formulas.join(' · ')}` : null,
    mistakes.length ? `반복 실수: ${mistakes.join(' · ')}` : null,
    tips.length ? `시험 팁: ${tips.join(' · ')}` : null,
    list.some((e) => asArray(e.calculation).length)
      ? '계산 순서를 단계별로 다시 확인하세요.'
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const version = (prev?.version || 0) + 1;
  const history = Array.isArray(prev?.history) ? [...prev.history] : [];
  if (prev?.body) {
    history.push({
      version: prev.version || history.length + 1,
      body: prev.body,
      at: prev.updatedAt || prev.at || new Date().toISOString(),
    });
  }

  return {
    patternId,
    patternName,
    version,
    body,
    entryCount: list.length,
    wrongCount: wrongs.length,
    history,
    updatedAt: new Date().toISOString(),
    schemaVersion: TEXTBOOK_BUILDER_VERSION,
  };
}

/**
 * Chapter (단원) summary when multiple patterns studied.
 */
export function buildChapterSummary(chapter, entries = [], prev = null) {
  if (!chapter) return null;
  const list = (entries || []).filter((e) => e.chapter === chapter);
  const patternIds = [...new Set(list.map((e) => e.patternId).filter(Boolean))];
  if (patternIds.length < 2 && list.length < 5) return null;

  const wrongs = list.filter((e) => !e.correct);
  const formulas = [...new Set(list.flatMap((e) => asArray(e.formula)))].slice(0, 8);
  const tips = [...new Set(list.flatMap((e) => asArray(e.examTip)))].slice(0, 5);

  const body = [
    `【${chapter}】 단원 요약`,
    `핵심 개념: ${patternIds.length}개 Pattern · ${list.length}문제 학습`,
    wrongs.length
      ? `자주 틀리는 부분: 오답 ${wrongs.length}건 (${Math.round((wrongs.length / list.length) * 100)}%)`
      : '자주 틀리는 부분: 현재 안정적',
    formulas.length ? `시험 포인트(공식): ${formulas.join(' · ')}` : null,
    tips.length ? `시험 포인트(팁): ${tips.join(' · ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const version = (prev?.version || 0) + 1;
  const history = Array.isArray(prev?.history) ? [...prev.history] : [];
  if (prev?.body) {
    history.push({
      version: prev.version || history.length + 1,
      body: prev.body,
      at: prev.updatedAt || new Date().toISOString(),
    });
  }

  return {
    chapter,
    version,
    body,
    patternIds,
    entryCount: list.length,
    wrongCount: wrongs.length,
    history,
    updatedAt: new Date().toISOString(),
    schemaVersion: TEXTBOOK_BUILDER_VERSION,
  };
}

/**
 * Weak Collection — most missed formulas / patterns.
 */
export function buildWeakCollection(entries = []) {
  const formulaHits = new Map();
  const patternHits = new Map();

  for (const e of entries || []) {
    if (e.correct) continue;
    for (const f of asArray(e.formula)) {
      const cur = formulaHits.get(f) || { formula: f, wrong: 0, total: 0 };
      cur.wrong += 1;
      cur.total += 1;
      formulaHits.set(f, cur);
    }
    if (e.patternId) {
      const cur = patternHits.get(e.patternId) || {
        patternId: e.patternId,
        patternName: e.patternName || e.patternId,
        wrong: 0,
        total: 0,
      };
      cur.wrong += 1;
      cur.total += 1;
      patternHits.set(e.patternId, cur);
    }
  }

  /* also count correct for formula totals */
  for (const e of entries || []) {
    if (!e.correct) continue;
    for (const f of asArray(e.formula)) {
      const cur = formulaHits.get(f);
      if (cur) cur.total += 1;
    }
    if (e.patternId && patternHits.has(e.patternId)) {
      patternHits.get(e.patternId).total += 1;
    }
  }

  const weakFormulas = [...formulaHits.values()]
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total)
    .slice(0, 20);

  const weakPatterns = [...patternHits.values()]
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total)
    .slice(0, 20);

  return {
    titleWeakFormula: '내가 가장 자주 틀리는 공식',
    titleWeakPattern: '내가 가장 많이 틀린 Pattern',
    weakFormulas,
    weakPatterns,
    updatedAt: new Date().toISOString(),
  };
}

export default {
  TEXTBOOK_BUILDER_VERSION,
  buildTextbookEntry,
  buildPatternSummary,
  buildChapterSummary,
  buildWeakCollection,
};
