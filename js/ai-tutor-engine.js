/**
 * AI Exam Learning Platform v2
 * AI Tutor Engine — 로컬 규칙 기반 설명 생성 (Phase 5)
 * 외부 API 없음 · Frozen DB 읽기 전용 · Pattern·해설·오답 컨텍스트 활용
 */

import { getChoiceLabel } from './data-loader.js';
import { getMemoryPoint, getSolutionDisplay } from './question-engine.js';
import {
  getPatternDescription,
  getPatternLearningPoints,
} from './pattern-engine.js';

/** Pattern별 흔한 오류 (UI 레이어 — DB 미변경) */
const PATTERN_COMMON_MISTAKES = {
  ACC_INV_001: 'FOB 선적/도착 조건과 위탁·적송·시송의 기말재고 포함 여부를 혼동하기 쉽습니다.',
  ACC_INV_003: '운반비·부대비용의 재고원가 포함과 VAT/매입할인 처리를 반대로 적용하는 경우가 많습니다.',
  ACC_INV_004: 'PER법에서 기말재고를 빼지 않거나, 기초+매입-기말 순서를 틀리는 실수가 잦습니다.',
  ACC_INV_005: 'PER법(기말 실사)과 PR법(매 거래 확인)의 차이를 구분하지 못합니다.',
  ACC_INV_006: 'FIFO와 총평균법의 단가 계산, 실지재고조사법 vs 계속기록법 조합을 혼동합니다.',
  ACC_INV_007: 'LCM(순실현가능가치) 비교 시 추가원가 차감 누락, 감소손실 인식 시점 오류가 있습니다.',
};

/**
 * @param {object} params
 * @param {object} params.question
 * @param {object|null} params.pattern
 * @param {object|null} params.result - gradeAnswer 결과
 * @param {object|null} params.statistics
 * @param {string} [params.level] - beginner | intermediate | advanced
 */
export function generateAiExplanation({ question, pattern, result, statistics, level = 'intermediate' }) {
  const isWrong = result && !result.correct;
  const selected = result?.selectedAnswer;
  const correct = Number(question.answer);
  const selectedText = selected ? question.choices[selected - 1] : null;
  const correctText = question.choices[correct - 1];

  const sections = [];

  if (isWrong) {
    sections.push({
      id: 'why-wrong',
      title: '왜 틀렸는지',
      content: buildWhyWrong({
        question,
        pattern,
        selected,
        correct,
        selectedText,
        correctText,
        level,
      }),
    });
  } else {
    sections.push({
      id: 'why-correct',
      title: '정답 포인트',
      content: buildWhyCorrect({ question, pattern, correct, correctText, level }),
    });
  }

  sections.push({
    id: 'key-concept',
    title: '핵심 개념',
    content: buildKeyConcept({ question, pattern, statistics, level }),
  });

  sections.push({
    id: 'memory',
    title: '암기 방법',
    content: buildMemoryMethod({ question, pattern, level }),
  });

  if (isWrong) {
    sections.push({
      id: 'next-step',
      title: '다음 학습 제안',
      content: buildNextStep({ question, pattern, statistics }),
    });
  }

  return {
    questionId: question.questionId,
    patternId: question.patternId,
    level,
    isWrong,
    generatedAt: new Date().toISOString(),
    sections,
  };
}

function buildWhyWrong({ question, pattern, selected, correct, selectedText, correctText, level }) {
  const parts = [];

  parts.push(
    `선택하신 ${getChoiceLabel(selected)}번 "${selectedText || '-'}"은(는) 정답이 아닙니다. 정답은 ${getChoiceLabel(correct)}번 "${correctText || '-'}"입니다.`
  );

  const mistake = PATTERN_COMMON_MISTAKES[question.patternId];
  if (mistake) {
    parts.push(`\n[Pattern 오류 패턴]\n${mistake}`);
  }

  if (level === 'beginner') {
    parts.push(`\n[기초 TIP]\n문제 지문의 조건(FOB, PER, FIFO 등)을 먼저 밑줄 친 뒤, 각 보기가 그 조건과 맞는지 하나씩 대조해 보세요.`);
  } else if (level === 'advanced') {
    parts.push(`\n[출제 의도]\n${pattern?.name || question.patternId} Pattern — ${pattern?.grade || '-'}급, 기출 ${pattern?.frequency || '-'}회 출제`);
    if (/계산|금액|원가|￦|\d/.test(question.question + (question.originalQuestion || ''))) {
      parts.push('수치형 함정: 중간 계산(단가·수량·잔액)에서 소수점/단위를 놓치면 오답 보기와 일치할 수 있습니다.');
    }
  }

  const solSnippet = getSolutionDisplay(question).slice(0, 400);
  if (solSnippet) {
    parts.push(`\n[해설 참고]\n${solSnippet}${solSnippet.length >= 400 ? '…' : ''}`);
  }

  return parts.join('\n');
}

function buildWhyCorrect({ question, pattern, correct, correctText, level }) {
  const parts = [
    `${getChoiceLabel(correct)}번 "${correctText || '-'}"이(가) 정답입니다.`,
    `\n[Pattern] ${pattern?.name || question.patternId}`,
  ];

  if (level === 'beginner') {
    parts.push('정답을 맞혔더라도, 왜 다른 보기가 틀렸는지까지 설명할 수 있어야 시험에서 변형 문제에 대응할 수 있습니다.');
  }

  return parts.join('\n');
}

function buildKeyConcept({ question, pattern, statistics, level }) {
  const parts = [];

  parts.push(getPatternDescription(question.patternId));

  const points = getPatternLearningPoints(question.patternId);
  if (points.length) {
    parts.push('\n[학습 포인트]');
    points.forEach((p, i) => parts.push(`${i + 1}. ${p}`));
  }

  if (statistics) {
    parts.push(`\n[출제 통계] ${statistics.totalCount}회 출제 · 우선순위 ${statistics.priority}`);
    if (statistics.recentYears?.length) {
      parts.push(`최근 출제: ${statistics.recentYears.join(', ')}년`);
    }
  }

  if (level === 'advanced' && pattern) {
    parts.push(`\n[Pattern 등급] ${pattern.grade}급 — ${pattern.importance}% 중요도`);
  }

  return parts.join('\n');
}

function buildMemoryMethod({ question, pattern, level }) {
  const memory = getMemoryPoint(question, pattern);
  const parts = [memory];

  if (level === 'beginner') {
    parts.push('\n[암기 TIP] Pattern 이름을 키워드로 flashcard를 만들고, 기출 1문제와 짝지어 반복하세요.');
  } else {
    parts.push('\n[복습 TIP] 같은 Pattern의 다른 기출 문항 2~3개를 연속 풀이하면 출제 패턴이 몸에 붙습니다.');
  }

  return parts.join('\n');
}

function buildNextStep({ question, pattern, statistics }) {
  const parts = [];

  if (statistics?.priority === 'HIGH') {
    parts.push('이 Pattern은 HIGH 우선순위입니다. 오답 노트에서 같은 Pattern 문항을 추가로 복습하세요.');
  }

  parts.push(`Pattern 학습 Dashboard에서 "${pattern?.name || question.patternId}" 관련 문항을 다시 풀어 보세요.`);
  parts.push('오답 노트 → "다시 풀기"로 동일 유형을 재도전하면 취약도가 빠르게 개선됩니다.');

  return parts.join('\n');
}

/**
 * DOM 렌더용 HTML (XSS escape는 호출측에서 textContent 사용 권장)
 * @param {object} explanation - generateAiExplanation 결과
 */
export function renderExplanationSections(explanation) {
  return explanation.sections
    .map(
      (s) =>
        `<section class="ai-section" data-section="${s.id}"><h4 class="ai-section__title">${s.title}</h4><pre class="ai-section__body">${s.content}</pre></section>`
    )
    .join('');
}
