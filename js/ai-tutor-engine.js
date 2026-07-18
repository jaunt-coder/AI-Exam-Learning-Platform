/**
 * AI Exam Learning Platform v2
 * AI Tutor Engine v2.1 — Pattern Profile + Question Override (Phase 5.1)
 *
 * PDF solution 필드는 정답 검증용으로만 사용한다.
 * 학습자에게는 Question Override → Pattern Profile 기반 새 설명만 제공한다.
 *
 *   Question → Question Override → Pattern Profile → Tutor Lesson (8단계)
 */

import { getChoiceLabel } from './data-loader.js';
import {
  getPatternDescription,
  getPatternLearningPoints,
} from './pattern-engine.js';
import { filterQuestionsByPattern } from './question-engine.js';
import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
  buildFallbackProfile,
} from './ai-tutor-content/pattern-profiles.js';
import {
  getQuestionOverride,
} from './ai-tutor-content/question-overrides.js';
import {
  getCalculationTemplate,
} from './ai-tutor-content/calculation-templates.js';

/** 범용 8단계 과외 섹션 ID */
export const TUTOR_SECTION_IDS = {
  WHY_WRONG: 'why-wrong',
  SOLVING_ORDER: 'solving-order',
  EXAM_THINKING: 'exam-thinking',
  MEMORY_TIP: 'memory-tip',
  EXAMINER_TRAP: 'examiner-trap',
  RELATED_PATTERN: 'related-pattern',
  SIMILAR_PROBLEMS: 'similar-problems',
  NEXT_LEARNING: 'next-learning',
};

const LEVEL_LABELS = {
  beginner: '기초 과외',
  intermediate: '표준 과외',
  advanced: '심화 과외',
};

/** DB Pattern과 실제 주제가 다른 문항 (Override로 보정) */
const PATTERN_MISMATCH_QUESTION_IDS = new Set([
  'ACC_INV_Q011',
  'ACC_INV_Q012',
]);

/**
 * Override · Profile · Calculation Template을 병합한다.
 * @param {object} question
 * @param {object|null} pattern
 * @param {object|null} override
 * @param {object} profile
 * @returns {object}
 */
function mergeTutorSources(question, pattern, override, profile) {
  const templateId = override?.templateId ?? profile.defaultTemplateId ?? null;
  const template = templateId ? getCalculationTemplate(templateId) : null;
  const stem = `${question.question} ${question.originalQuestion || ''}`;
  const correct = Number(question.answer);

  let explanation = override?.explanation ?? profile.explanation;
  explanation = enrichExplanation(explanation, question, pattern, stem, override);

  let solvingAlgorithm = override?.solvingAlgorithm?.length
    ? [...override.solvingAlgorithm]
    : [...(profile.solvingAlgorithm || [])];

  if (template && !override?.solvingAlgorithm?.length) {
    solvingAlgorithm = [
      `[${template.title}] ${template.formula}`,
      ...template.steps,
      ...solvingAlgorithm,
    ];
  }

  const examThinking = override?.examThinking?.length
    ? [...override.examThinking]
    : [...(profile.examThinking || [])];

  let memoryTip = override?.memoryTip ?? profile.memoryTip;
  if (template?.memoryHook && !override?.memoryTip) {
    memoryTip = `${memoryTip}\n\n[계산 템플릿] ${template.memoryHook}`;
  }

  const examinerIntent = override?.examinerIntent ?? profile.examinerIntent;
  const similarTrap = enrichTrap(
    override?.similarTrap ?? profile.similarTrap,
    question,
    stem,
  );

  const frequentlyConfusedWith = override?.frequentlyConfusedWith
    ?? buildFrequentlyConfusedWith(profile, question.patternId);

  const wrongAnswerAnalysis = override?.wrongAnswerAnalysis
    ? formatOverrideWrongAnalysis(question, override.wrongAnswerAnalysis, correct)
    : buildWrongAnswerAnalysis(question, profile, correct);

  return {
    title: override?.title ?? pattern?.name ?? question.patternId,
    questionType: override?.questionType ?? inferQuestionType(question, stem),
    explanation,
    solvingAlgorithm,
    examThinking,
    wrongAnswerAnalysis,
    examinerIntent,
    memoryTip,
    similarTrap,
    frequentlyConfusedWith,
    resolvable: override?.resolvable ?? hasDetailedSteps(solvingAlgorithm),
    templateId,
    templateTitle: template?.title ?? null,
    hasOverride: Boolean(override),
  };
}

function inferQuestionType(question, stem) {
  if (/옳지 않은|틀린|거리가 먼/.test(stem)) return 'incorrect_statement';
  if (/계산|금액|￦|\d{3,}/.test(stem)) return 'calculation';
  if (question.choices?.some((c) => /ㄱ|ㄴ|ㄷ|ㄹ|ㅁ|ㅂ|ㅅ|ㅇ/.test(String(c)))) return 'mixed';
  return 'concept';
}

function hasDetailedSteps(steps) {
  return Array.isArray(steps) && steps.length >= 3
    && steps.some((s) => /\d|=|×|÷|\+|\-/.test(String(s)));
}

/**
 * @param {object} question
 * @param {object|null} pattern
 * @param {number|null} [selectedAnswer]
 * @returns {object} QuestionTutorContent
 */
export function generateQuestionTutorContent(question, pattern, selectedAnswer = null) {
  const override = getQuestionOverride(question.questionId);
  const profile = PATTERN_TUTOR_PROFILES[question.patternId]
    || buildFallbackProfile(question, pattern, getPatternDescription);
  const merged = mergeTutorSources(question, pattern, override, profile);

  return {
    explanation: merged.explanation,
    solvingAlgorithm: merged.solvingAlgorithm,
    examThinking: merged.examThinking,
    wrongAnswerAnalysis: merged.wrongAnswerAnalysis,
    examinerIntent: merged.examinerIntent,
    memoryTip: merged.memoryTip,
    similarTrap: merged.similarTrap,
    frequentlyConfusedWith: merged.frequentlyConfusedWith,
    _meta: {
      questionId: question.questionId,
      patternId: question.patternId,
      title: merged.title,
      questionType: merged.questionType,
      resolvable: merged.resolvable,
      hasOverride: merged.hasOverride,
      templateId: merged.templateId,
      templateTitle: merged.templateTitle,
      selectedAnalysis: selectedAnswer ? merged.wrongAnswerAnalysis[selectedAnswer] : null,
    },
  };
}

function enrichExplanation(base, question, pattern, stem, override) {
  const parts = [base];

  if (override && PATTERN_MISMATCH_QUESTION_IDS.has(question.questionId)) {
    parts.push(
      `\n※ 이 문항은 Pattern(${question.patternId})과 주제가 다릅니다. 문항별 과외 콘텐츠로 풀이합니다.`,
    );
  }

  if (/옳지 않은|틀린|거리가 먼/.test(stem)) {
    parts.push('\n※ 이 문항은 "옳지 않은 것"을 고르는 유형입니다. 각 보기를 O/X로 판별하세요.');
  }

  if (pattern?.grade) {
    parts.push(`\n[Pattern] ${pattern.name} (${pattern.grade}급 · 기출 ${pattern.frequency}회)`);
  }

  return parts.join('');
}

function enrichTrap(base, question, stem) {
  if (!base) return base;
  if (/계산|금액|￦|\d{3,}/.test(stem)) {
    return `${base}\n\n수치 함정: 단위·비율·중간 계산 한 단계만 틀려도 보기와 일치할 수 있습니다.`;
  }
  return base;
}

function buildFrequentlyConfusedWith(profile, patternId) {
  const parts = [profile.frequentlyConfusedWith];
  (profile.confusedPatterns || []).forEach((pid) => {
    parts.push(`\n↔ ${PATTERN_NAMES[pid] || pid}: ${getPatternDescription(pid).slice(0, 120)}…`);
  });
  return parts.filter(Boolean).join('');
}

/**
 * Override 보기별 분석을 표준 형식으로 변환한다.
 * @param {object} question
 * @param {Record<number|string, string>} overrideMap
 * @param {number} correct
 * @returns {Record<number, string>}
 */
function formatOverrideWrongAnalysis(question, overrideMap, correct) {
  const analysis = {};

  question.choices.forEach((choiceText, idx) => {
    const num = idx + 1;
    if (num === correct) return;

    const label = getChoiceLabel(num);
    const reason = overrideMap[num] ?? overrideMap[String(num)];

    if (reason) {
      analysis[num] = `${label} "${choiceText}" — ${reason}`;
    }
  });

  return analysis;
}

/**
 * @param {object} question
 * @param {object} profile
 * @param {number} correct
 * @returns {Record<number, string>}
 */
function buildWrongAnswerAnalysis(question, profile, correct) {
  const analysis = {};
  const reasons = profile.wrongReasons || {};
  const reasonKeys = Object.keys(reasons);

  question.choices.forEach((choiceText, idx) => {
    const num = idx + 1;
    if (num === correct) return;

    const label = getChoiceLabel(num);
    const reason = pickWrongReason(question, profile, num, correct, choiceText, reasons, reasonKeys);

    analysis[num] = `${label} "${choiceText}" — ${reason}`;
  });

  return analysis;
}

function pickWrongReason(question, profile, choiceNum, correct, choiceText, reasons, reasonKeys) {
  const stem = `${question.question} ${question.originalQuestion || ''}`.toLowerCase();
  const text = String(choiceText).toLowerCase();

  if (/vat|부가|세금/.test(text) || /vat|부가/.test(stem)) {
    if (reasons.vat) return reasons.vat;
  }
  if (/할인|에누리/.test(text)) {
    if (reasons.discount) return reasons.discount;
  }
  if (/fifo|선입|선출/.test(stem) || /fifo|선입/.test(text)) {
    if (reasons.fifo) return reasons.fifo;
  }
  if (/평균|가중/.test(stem) || /평균/.test(text)) {
    if (reasons.avg) return reasons.avg;
  }
  if (/fob|선적|도착|운송/.test(stem)) {
    if (reasons.fob_swap) return reasons.fob_swap;
  }
  if (/위탁|적송/.test(stem)) {
    if (reasons.consignment) return reasons.consignment;
  }
  if (/시송/.test(stem)) {
    if (reasons.trial) return reasons.trial;
  }
  if (/per|pr|실지|계속/.test(stem)) {
    if (reasons.per_pr) return reasons.per_pr;
    if (reasons.method) return reasons.method;
  }
  if (/lcm|순실현|nrv|순매/.test(stem)) {
    if (reasons.nrv) return reasons.nrv;
    if (reasons.no_loss) return reasons.no_loss;
  }
  if (/\d/.test(text) && reasons.calc) {
    return reasons.calc;
  }
  if (reasons.formula) return reasons.formula;
  if (reasons.generic) return reasons.generic;

  const fallbackIdx = (choiceNum + correct) % Math.max(reasonKeys.length, 1);
  return reasons[reasonKeys[fallbackIdx]] || 'Pattern 핵심 원칙과 맞지 않는 선택입니다.';
}

/**
 * @param {object} params
 */
export function generateTutorLesson({
  question,
  pattern,
  result,
  statistics,
  allQuestions = [],
  allPatterns = [],
  level = 'intermediate',
}) {
  const content = generateQuestionTutorContent(question, pattern, result?.selectedAnswer);
  const profile = PATTERN_TUTOR_PROFILES[question.patternId] || {};
  const isWrong = result && !result.correct;
  const selected = result?.selectedAnswer;
  const correct = Number(question.answer);

  const sections = [];

  // ① 왜 틀렸는가
  if (isWrong && selected) {
    const selectedText = question.choices[selected - 1];
    const selectedAnalysis = content.wrongAnswerAnalysis[selected] || '';
    sections.push({
      id: TUTOR_SECTION_IDS.WHY_WRONG,
      title: '① 왜 틀렸는가',
      shortTitle: '① 오답',
      content: `선택: ${getChoiceLabel(selected)} "${selectedText}"\n\n${selectedAnalysis}`,
      items: Object.entries(content.wrongAnswerAnalysis)
        .filter(([num]) => Number(num) !== selected)
        .slice(0, 2)
        .map(([num, text]) => ({
          label: `참고 — 다른 오답 ${getChoiceLabel(Number(num))}`,
          content: text,
        })),
    });
  } else {
    sections.push({
      id: TUTOR_SECTION_IDS.WHY_WRONG,
      title: '① 정답 확인',
      shortTitle: '① 정답',
      content: `${getChoiceLabel(correct)} "${question.choices[correct - 1]}"이(가) 정답입니다.\n\n${content.explanation}`,
      items: Object.entries(content.wrongAnswerAnalysis)
        .slice(0, 3)
        .map(([num, text]) => ({
          label: `다른 보기 ${getChoiceLabel(Number(num))}가 틀린 이유`,
          content: text,
        })),
    });
  }

  // ② 올바른 풀이순서
  sections.push({
    id: TUTOR_SECTION_IDS.SOLVING_ORDER,
    title: '② 올바른 풀이순서',
    shortTitle: '② 풀이',
    steps: content.solvingAlgorithm,
  });

  // ③ 시험장에서 생각하는 순서
  sections.push({
    id: TUTOR_SECTION_IDS.EXAM_THINKING,
    title: '③ 시험장에서 생각하는 순서',
    shortTitle: '③ 시험장',
    steps: content.examThinking?.length
      ? content.examThinking
      : profile.examThinking || [
        '문제 유형(계산/개념/옳지 않은 것) 3초 확인.',
        'Pattern 키워드 밑줄.',
        '원칙 1줄 적고 보기 대조.',
      ],
  });

  // ④ 암기법
  sections.push({
    id: TUTOR_SECTION_IDS.MEMORY_TIP,
    title: '④ 암기법',
    shortTitle: '④ 암기',
    content: content.memoryTip,
  });

  // ⑤ 출제자의 함정
  sections.push({
    id: TUTOR_SECTION_IDS.EXAMINER_TRAP,
    title: '⑤ 출제자의 함정',
    shortTitle: '⑤ 함정',
    items: [
      { label: '출제 의도', content: content.examinerIntent },
      { label: '비슷한 함정', content: content.similarTrap },
      { label: '자주 혼동', content: content.frequentlyConfusedWith },
    ],
  });

  // ⑥ 관련 Pattern
  const learningPoints = getPatternLearningPoints(question.patternId);
  let patternContent = getPatternDescription(question.patternId);
  if (content._meta.hasOverride) {
    patternContent += `\n\n[과외] 이 문항은 문항별 Override 콘텐츠(${content._meta.title})를 우선 적용합니다.`;
  }
  if (statistics) {
    patternContent += `\n\n[출제] ${statistics.totalCount}회 · 우선순위 ${statistics.priority}`;
    if (statistics.recentYears?.length) {
      patternContent += ` · 최근 ${statistics.recentYears.join(', ')}년`;
    }
  }
  sections.push({
    id: TUTOR_SECTION_IDS.RELATED_PATTERN,
    title: '⑥ 관련 Pattern',
    shortTitle: '⑥ Pattern',
    content: patternContent,
    items: learningPoints.map((p, i) => ({
      label: `학습 포인트 ${i + 1}`,
      content: p,
    })),
  });

  // ⑦ 비슷한 문제
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
      href: `question.html?pattern=${encodeURIComponent(question.patternId)}&id=${encodeURIComponent(qid)}`,
    })),
  });

  // ⑧ 다음 추천학습
  sections.push({
    id: TUTOR_SECTION_IDS.NEXT_LEARNING,
    title: '⑧ 다음 추천학습',
    shortTitle: '⑧ 추천',
    links: buildNextLearningLinks(question, pattern, statistics, isWrong, result),
    content: buildNextLearningText(question, pattern, statistics, isWrong, level),
  });

  return {
    version: 2.1,
    questionId: question.questionId,
    patternId: question.patternId,
    patternName: pattern?.name || question.patternId,
    level,
    levelLabel: LEVEL_LABELS[level] || LEVEL_LABELS.intermediate,
    isWrong,
    generatedAt: new Date().toISOString(),
    content,
    sections,
  };
}

function buildNextLearningText(question, pattern, statistics, isWrong, level) {
  const parts = [];
  if (isWrong) {
    parts.push('이 문항을 오답 노트에 저장했습니다. 24시간 내 같은 Pattern 2~3문제를 풀면 기억 정착률이 높아집니다.');
  } else if (level === 'advanced') {
    parts.push('정답입니다. 변형·함정 보기 대응을 위해 다른 기출 2문제를 추가로 풀어보세요.');
  } else {
    parts.push('잘 풀었습니다. 같은 Pattern 유사 문항으로 응용력을 확인하세요.');
  }
  if (statistics?.priority === 'HIGH') {
    parts.push('HIGH 우선순위 Pattern — 시험 직전까지 반복 복습을 권장합니다.');
  }
  return parts.join('\n\n');
}

function buildNextLearningLinks(question, pattern, statistics, isWrong, result) {
  const links = [
    {
      label: `${pattern?.name || 'Pattern'} Dashboard`,
      href: `pattern.html?pattern=${encodeURIComponent(question.patternId)}`,
    },
  ];
  if (isWrong && result?.selectedAnswer) {
    links.push({
      label: '오답 노트에서 복습',
      href: `wrong-note.html?pattern=${encodeURIComponent(question.patternId)}`,
    });
    links.push({
      label: 'AI Tutor에서 자세히',
      href: `ai-tutor.html?id=${encodeURIComponent(question.questionId)}&selected=${encodeURIComponent(String(result.selectedAnswer))}`,
    });
  }
  links.push({
    label: '모의시험으로 실전 연습',
    href: 'exam.html',
  });
  return links;
}

/** @deprecated v1 호환 — generateTutorLesson 사용 권장 */
export function generateAiExplanation(params) {
  return generateTutorLesson(params);
}

export function getSimilarQuestions(question, allQuestions, limit = 4) {
  return filterQuestionsByPattern(allQuestions, question.patternId)
    .filter((q) => q.questionId !== question.questionId)
    .slice(0, limit);
}

export function renderExplanationSections(lesson) {
  return lesson.sections
    .map((s) => `<section class="tutor-section" data-section="${s.id}"><h4>${s.title}</h4></section>`)
    .join('');
}
