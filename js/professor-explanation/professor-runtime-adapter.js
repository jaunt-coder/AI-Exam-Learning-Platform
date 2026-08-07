/**
 * Sprint-17D.5 / 17D.5.1 — Professor Explanation Runtime Adapter
 *
 * AI Tutor entry:
 *   checkAIConfig()
 *     → YES: Professor Engine → mapProfessorToTutorLesson (Professor SSOT)
 *     → NO / fail: LOCAL_PROFESSOR via generateTutorLesson
 *
 * 17D.5.1: Gemini path does NOT call generateTutorLesson scaffold.
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Learning / Recommendation / Mastery formulas.
 */

import { checkAIConfig } from '../llm/ai-config.js';
import {
  generateTutorLesson,
  TUTOR_SECTION_IDS,
} from '../ai-tutor-engine.js';
import { getChoiceLabel } from '../data-loader.js';
import {
  getPatternDescription,
  getPatternLearningPoints,
} from '../pattern-engine.js';
import {
  generateProfessorExplanation,
  PROFESSOR_RUNTIME,
} from './professor-engine.js';

export const ADAPTER_VERSION = '17D.5.1';

const LEVEL_LABELS = {
  beginner: '기초 과외',
  intermediate: '표준 과외',
  advanced: '심화 과외',
};

/**
 * Normalize engine provider → lesson provider label.
 * @param {object} professor
 * @returns {'GEMINI'|'LOCAL_PROFESSOR'|'CACHE'|'OVERRIDE_APPROVED'|string}
 */
export function normalizeLessonProvider(professor = {}) {
  const raw = String(professor.provider || '').trim();
  if (raw === 'LOCAL_PROFESSOR' || raw === 'LOCAL') return 'LOCAL_PROFESSOR';
  if (raw === 'override-approved') return 'OVERRIDE_APPROVED';
  if (raw === 'cache') return 'CACHE';
  if (raw === 'GEMINI' || raw === '') return 'GEMINI';
  return raw;
}

/**
 * @param {object} professor
 * @param {string} provider
 */
export function buildLessonMetadata(professor = {}, provider = 'LOCAL_PROFESSOR') {
  const hit = Boolean(professor.cacheHit || professor.fromCache);
  return {
    provider,
    runtime:
      provider === 'GEMINI' || provider === 'CACHE'
        ? (professor.runtime || PROFESSOR_RUNTIME)
        : null,
    model:
      provider === 'LOCAL_PROFESSOR'
        ? undefined
        : (professor.model || professor.modelVersion || undefined),
    cacheStatus: hit ? 'HIT' : 'MISS',
    generatedAt: new Date().toISOString(),
  };
}

function attachLessonMeta(lesson, professor, provider) {
  const metadata = buildLessonMetadata(professor || {}, provider);
  return {
    ...lesson,
    provider,
    providerLabel: provider,
    model: metadata.model,
    runtime: metadata.runtime,
    cacheHit: metadata.cacheStatus === 'HIT',
    cacheStatus: metadata.cacheStatus,
    metadata,
    adapterVersion: ADAPTER_VERSION,
  };
}

/**
 * Map engine provider → UI provider (17D.5.1).
 * Cache hit of Gemini payload → GEMINI (cacheStatus HIT in metadata).
 */
export function resolveDisplayProvider(professor = {}) {
  const provider = normalizeLessonProvider(professor);
  if (provider === 'LOCAL_PROFESSOR') return 'LOCAL_PROFESSOR';
  if (provider === 'OVERRIDE_APPROVED') return 'OVERRIDE_APPROVED';
  /* engine 'cache' or GEMINI+cacheHit → GEMINI + HIT */
  if (provider === 'CACHE' || provider === 'GEMINI') return 'GEMINI';
  return provider;
}

/**
 * @param {{
 *   question: object,
 *   pattern?: object|null,
 *   result?: object,
 *   statistics?: object|null,
 *   allQuestions?: object[],
 *   allPatterns?: object[],
 *   level?: string,
 *   learningContext?: object|null,
 *   force?: boolean,
 *   stream?: boolean,
 *   onDelta?: Function,
 * }} input
 */
export async function generateTutorLessonWithRuntime(input = {}) {
  const level = String(input.level || 'intermediate');
  const question = input.question || {};
  const pattern = input.pattern || null;
  const result = input.result || null;
  const ai = checkAIConfig();

  const localLesson = (extra = {}) => {
    const lesson = generateTutorLesson({
      question,
      pattern,
      result,
      statistics: input.statistics,
      allQuestions: input.allQuestions || [],
      allPatterns: input.allPatterns || [],
      level,
      learningContext: input.learningContext,
    });
    return {
      ...attachLessonMeta(lesson, { cacheHit: false }, 'LOCAL_PROFESSOR'),
      professor: null,
      fromRuntime: false,
      ...extra,
    };
  };

  if (!ai.ok) {
    console.log('[professor-runtime-adapter] Gemini disabled → LOCAL_PROFESSOR');
    return localLesson();
  }

  console.log('[professor-runtime-adapter] → Professor Engine / Gemini Runtime', {
    model: ai.model,
    runtime: PROFESSOR_RUNTIME,
    level,
  });

  try {
    const professor = await generateProfessorExplanation({
      question,
      pattern,
      grade: {
        selectedAnswer: result?.selectedAnswer,
        isCorrect: Boolean(result?.correct),
      },
      level,
      force: Boolean(input.force),
      allowLocal: true,
      saveCache: true,
      fastMode: true,
      skipRegen: true,
      stream: Boolean(input.stream),
      onDelta: input.onDelta,
    });

    if (!professor?.ok || !professor?.payload) {
      console.warn('[professor-runtime-adapter] Gemini failed → LOCAL_PROFESSOR', {
        error: professor?.error,
        detail: professor?.detail,
      });
      return localLesson({
        fallbackFrom: 'GEMINI',
        fallbackError: professor?.error || 'gemini_generate_failed',
      });
    }

    const rawProvider = normalizeLessonProvider(professor);
    const lessonProvider = resolveDisplayProvider(professor);
    const lesson = mapProfessorToTutorLesson(professor, {
      question,
      pattern,
      result,
      statistics: input.statistics,
      allQuestions: input.allQuestions,
      allPatterns: input.allPatterns,
      level,
      learningContext: input.learningContext,
    });

    const attached = attachLessonMeta(lesson, professor, lessonProvider);
    /* Expose raw engine provider when distinct (CACHE / OVERRIDE) for debugging */
    if (rawProvider === 'CACHE' || rawProvider === 'OVERRIDE_APPROVED') {
      attached.metadata = {
        ...attached.metadata,
        engineProvider: rawProvider,
      };
      if (rawProvider === 'OVERRIDE_APPROVED') {
        attached.provider = 'OVERRIDE_APPROVED';
        attached.providerLabel = 'OVERRIDE_APPROVED';
        attached.metadata.provider = 'OVERRIDE_APPROVED';
      }
    }

    return {
      ...attached,
      professor,
      fromRuntime: lessonProvider === 'GEMINI' || rawProvider === 'CACHE',
      durationMs: professor.durationMs,
      qualityScore: professor.qualityScore,
    };
  } catch (err) {
    console.warn('[professor-runtime-adapter] exception → LOCAL_PROFESSOR', err);
    return localLesson({
      fallbackFrom: 'GEMINI',
      fallbackError: String(err?.message || err),
    });
  }
}

/**
 * Build Tutor Lesson from Professor payload only (no generateTutorLesson scaffold).
 * Keeps renderTutorLesson 8-section contract.
 */
export function mapProfessorToTutorLesson(professor, ctx = {}) {
  const payload = professor.payload || {};
  const question = ctx.question || {};
  const pattern = ctx.pattern || null;
  const result = ctx.result || {};
  const statistics = ctx.statistics || null;
  const level = String(ctx.level || 'intermediate');
  const selected = result.selectedAnswer;
  const correct = Number(question.answer);
  const isWrong = Boolean(result && result.correct === false);
  const choiceRows = Array.isArray(payload.choiceAnalysis) ? payload.choiceAnalysis : [];
  const calcSteps = []
    .concat(payload.thinkingOrder || [])
    .concat(payload.solution?.calculation || payload.calculation || [])
    .filter(Boolean)
    .map(String);
  const memoryTip = [].concat(payload.memoryHack || []).filter(Boolean).join('\n');
  const examTips = [].concat(payload.examTip || []).filter(Boolean).map(String);
  const explanation =
    payload.problemUnderstanding
    || payload.solution?.explanation
    || payload.coreConcept
    || '';

  const sections = [];

  /* ① */
  if (isWrong && selected) {
    const selectedText = question.choices?.[selected - 1] || '';
    const row = choiceRows.find((c, i) => i + 1 === selected) || choiceRows[selected - 1];
    const reason = row?.reason || professor.diagnosis?.whyWrong || explanation;
    sections.push({
      id: TUTOR_SECTION_IDS.WHY_WRONG,
      title: '① 왜 틀렸는가',
      shortTitle: '① 오답',
      content: `선택: ${getChoiceLabel(selected)} "${selectedText}"\n\n${reason}`,
      items: choiceRows
        .map((c, i) => ({ num: i + 1, ...c }))
        .filter((c) => c.num !== selected && !c.correct)
        .slice(0, 2)
        .map((c) => ({
          label: `참고 — 다른 오답 ${getChoiceLabel(c.num)}`,
          content: c.reason || '',
        })),
    });
  } else {
    sections.push({
      id: TUTOR_SECTION_IDS.WHY_WRONG,
      title: '① 정답 확인',
      shortTitle: '① 정답',
      content:
        `${getChoiceLabel(correct)} "${question.choices?.[correct - 1] || ''}"이(가) 정답입니다.\n\n`
        + explanation,
      items: choiceRows
        .map((c, i) => ({ num: i + 1, ...c }))
        .filter((c) => !c.correct)
        .slice(0, 3)
        .map((c) => ({
          label: `다른 보기 ${getChoiceLabel(c.num)}가 틀린 이유`,
          content: c.reason || '',
        })),
    });
  }

  /* ② */
  sections.push({
    id: TUTOR_SECTION_IDS.SOLVING_ORDER,
    title: '② 올바른 풀이순서',
    shortTitle: '② 풀이',
    steps: calcSteps.length
      ? calcSteps
      : [payload.solution?.explanation || explanation || '풀이 단계를 확인하세요.'],
    content: payload.solution?.explanation || undefined,
  });

  /* ③ */
  sections.push({
    id: TUTOR_SECTION_IDS.EXAM_THINKING,
    title: '③ 시험장에서 생각하는 순서',
    shortTitle: '③ 시험장',
    steps: examTips.length
      ? examTips
      : (payload.thinkingOrder || []).map(String).filter(Boolean).length
        ? (payload.thinkingOrder || []).map(String)
        : [
          '출제 문장·조건을 확인한다.',
          String(payload.coreConcept || '핵심 개념을 적용한다.'),
          '보기별로 배제·확정한다.',
        ],
  });

  /* ④ */
  sections.push({
    id: TUTOR_SECTION_IDS.MEMORY_TIP,
    title: '④ 암기법',
    shortTitle: '④ 암기',
    content: memoryTip || payload.tutorMessage || '핵심 개념을 한 문장으로 복창하세요.',
  });

  /* ⑤ */
  sections.push({
    id: TUTOR_SECTION_IDS.EXAMINER_TRAP,
    title: '⑤ 출제자의 함정',
    shortTitle: '⑤ 함정',
    items: [
      {
        label: '출제 의도',
        content: payload.appliedTheory || payload.coreConcept || explanation,
      },
      {
        label: '비슷한 함정',
        content:
          choiceRows.find((c) => !c.correct)?.reason
          || examTips[0]
          || '유사 개념 혼동 보기를 먼저 배제한다.',
      },
      {
        label: '자주 혼동',
        content: payload.tutorMessage || memoryTip || '',
      },
    ],
  });

  /* ⑥ Pattern context (metadata only — not LOCAL tutor content dump) */
  const patternId = question.patternId || pattern?.patternId || '';
  const learningPoints = patternId ? getPatternLearningPoints(patternId) : [];
  let patternContent = patternId
    ? getPatternDescription(patternId)
    : (pattern?.name || 'Pattern 정보');
  if (statistics) {
    patternContent += `\n\n[출제] ${statistics.totalCount ?? '—'}회 · 우선순위 ${statistics.priority ?? '—'}`;
    if (statistics.recentYears?.length) {
      patternContent += ` · 최근 ${statistics.recentYears.join(', ')}년`;
    }
  }
  if (payload.coreConcept) {
    patternContent += `\n\n[Professor 핵심] ${payload.coreConcept}`;
  }
  sections.push({
    id: TUTOR_SECTION_IDS.RELATED_PATTERN,
    title: '⑥ 관련 Pattern',
    shortTitle: '⑥ Pattern',
    content: patternContent,
    items: (learningPoints || []).slice(0, 5).map((p, i) => ({
      label: `학습 포인트 ${i + 1}`,
      content: p,
    })),
  });

  /* ⑦ */
  const similar = (pattern?.relatedQuestions || [])
    .filter((id) => id !== question.questionId)
    .slice(0, 4);
  sections.push({
    id: TUTOR_SECTION_IDS.SIMILAR_PROBLEMS,
    title: '⑦ 비슷한 문제',
    shortTitle: '⑦ 유사',
    content: similar.length
      ? '같은 Pattern의 기출 문항을 연속 풀이하면 출제 패턴이 몸에 붙습니다.'
      : '동일 Pattern 기출을 추가 확보 중입니다.',
    links: similar.map((qid) => ({
      label: qid,
      href: `question.html?pattern=${encodeURIComponent(patternId)}&id=${encodeURIComponent(qid)}`,
    })),
  });

  /* ⑧ */
  sections.push({
    id: TUTOR_SECTION_IDS.NEXT_LEARNING,
    title: '⑧ 다음 추천학습',
    shortTitle: '⑧ 추천',
    content:
      payload.tutorMessage
      || (isWrong
        ? '오답 포인트를 암기한 뒤 같은 Pattern 유사 문항을 풀어보세요.'
        : '정답 사고 순서를 다음 기출에서 재현하세요.'),
    links: [
      {
        label: `${pattern?.name || patternId || 'Pattern'} Dashboard`,
        href: `pattern.html?pattern=${encodeURIComponent(patternId || '')}`,
      },
    ],
  });

  return {
    version: 2.1,
    questionId: question.questionId,
    patternId: patternId || null,
    patternName: pattern?.name || patternId || 'Pattern',
    level,
    levelLabel: LEVEL_LABELS[level] || LEVEL_LABELS.intermediate,
    isWrong,
    generatedAt: new Date().toISOString(),
    professorLevel: true,
    content: {
      explanation,
      solvingAlgorithm: calcSteps,
      examThinking: examTips,
      memoryTip,
      examinerIntent: payload.appliedTheory || payload.coreConcept || '',
      similarTrap: choiceRows.find((c) => !c.correct)?.reason || '',
      frequentlyConfusedWith: payload.tutorMessage || '',
    },
    sections,
  };
}

export default {
  ADAPTER_VERSION,
  generateTutorLessonWithRuntime,
  mapProfessorToTutorLesson,
  normalizeLessonProvider,
  resolveDisplayProvider,
  buildLessonMetadata,
};
