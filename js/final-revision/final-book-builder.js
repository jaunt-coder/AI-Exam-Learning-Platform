/**
 * Sprint-18A — Build Final Revision Book sections (①–⑩)
 */

import { listTextbookEntries } from '../personal-textbook/textbook-engine.js';
import { rankFormulas, rankWeakPatterns } from './final-book-rank.js';
import { buildCondensedFinalPayload, generateAiFinalSummary } from './final-summary.js';
import { buildExamDaySheet } from './exam-day-sheet.js';
import { buildMemorySheet } from './memory-sheet.js';
import { buildQuickReviewCards } from './quick-review.js';
import {
  getCurrentSubjectId,
  SUBJECT_FULL_NAMES,
  normalizeSubjectId,
} from '../subject/subject-adapter.js';

export const FINAL_BOOK_BUILDER_VERSION = '19A';

function repeatMistakes(entries) {
  const map = new Map();
  for (const e of entries) {
    if (e.correct) continue;
    const key = e.mistakeDiagnosis || (e.whyOthersWrong || [])[0] || '반복 오답';
    const cur = map.get(key) || { mistake: key, count: 0, patternIds: new Set() };
    cur.count += 1;
    if (e.patternId) cur.patternIds.add(e.patternId);
    map.set(key, cur);
  }
  return [...map.values()]
    .map((r) => ({
      mistake: r.mistake,
      count: r.count,
      patternIds: [...r.patternIds],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function calcOrderPages(entries) {
  const pages = [];
  for (const e of entries) {
    if (!e.calculation?.length) continue;
    pages.push({
      questionId: e.questionId,
      patternId: e.patternId,
      patternName: e.patternName,
      steps: e.calculation,
    });
  }
  return pages.slice(0, 40);
}

function checklist(weakPatterns, weakFormulas) {
  return [
    '시험 전날: 위험 Pattern TOP 5 암기 카드 1회',
    '시험 당일 아침: Memory Sheet 30초 훑기',
    '계산 문제: 단위·기초재고·단가 재확인',
    ...(weakFormulas.slice(0, 5).map((f) => `공식 확인: ${f.formula}`)),
    ...(weakPatterns.slice(0, 5).map((p) => `Pattern 점검: ${p.patternName}`)),
    '시간 배분: 쉬운 문제부터, 막히면 표시 후 통과',
    '답안 마킹 전 선택지 번호 재확인',
  ];
}

const CHEER = [
  '지금까지의 오답은 이미 당신의 해설집이 되었습니다. 오늘은 그 책만 믿으세요.',
  '위험 Pattern만 붙잡아도 점수는 올라갑니다. 차분히, 한 문제씩.',
  '당신은 이미 충분히 준비했습니다. 시험장에서는 평소처럼 계산 순서만 지키세요.',
];

/**
 * Assemble full Final Revision Book from Personal Textbook summaries.
 */
export function buildFinalRevisionBook(opts = {}) {
  const subjectId = normalizeSubjectId(opts.subjectId || getCurrentSubjectId());
  const subjectName = SUBJECT_FULL_NAMES[subjectId] || subjectId;
  const entries = listTextbookEntries();
  const formulas = rankFormulas(entries);
  const patterns = rankWeakPatterns(entries);
  const condensed = buildCondensedFinalPayload(entries);
  const aiSummary = generateAiFinalSummary(condensed);
  const twoWeeksAgo = Date.now() - 14 * 86400000;
  const recentWrong = entries.filter(
    (e) => !e.correct && Date.parse(e.at || e.date || '') >= twoWeeksAgo,
  );
  const masteryLow = patterns.filter((p) => p.mastery < 60);
  const mustFormulas = formulas.slice(0, 30);
  const weakFormulas = formulas.filter((f) => f.wrong > 0).slice(0, 20);
  const repeats = repeatMistakes(entries);
  const calcPages = calcOrderPages(entries);
  const memory = buildMemorySheet({
    formulas: mustFormulas,
    mistakes: repeats,
    patterns,
    subjectId,
  });
  const examDay = buildExamDaySheet({
    formulas: mustFormulas,
    calcPages,
    mistakes: repeats,
    patterns: masteryLow.length ? masteryLow : patterns,
    checklist: checklist(patterns, weakFormulas),
  });
  const quick = buildQuickReviewCards({
    formulas: mustFormulas,
    mistakes: repeats,
    patterns,
  });

  const sections = [
    {
      id: 1,
      title: '① 반드시 외워야 할 공식 TOP 30',
      items: mustFormulas,
    },
    {
      id: 2,
      title: '② 내가 가장 많이 틀린 공식',
      items: weakFormulas,
    },
    {
      id: 3,
      title: '③ Mastery 60 미만 Pattern',
      items: masteryLow,
    },
    {
      id: 4,
      title: '④ 최근 2주 오답',
      items: recentWrong.map((e) => ({
        questionId: e.questionId,
        patternId: e.patternId,
        mistake: e.mistakeDiagnosis,
        at: e.at,
      })),
    },
    {
      id: 5,
      title: '⑤ 반복 실수 TOP 20',
      items: repeats,
    },
    {
      id: 6,
      title: '⑥ 시험에 나올 가능성이 높은 핵심 포인트(위험 우선 · 출제예측 아님)',
      items: [aiSummary.text],
      predictionForbidden: true,
    },
    {
      id: 7,
      title: '⑦ 30초 암기 카드',
      items: memory.cards,
    },
    {
      id: 8,
      title: '⑧ 계산 순서만 모은 페이지',
      items: calcPages,
    },
    {
      id: 9,
      title: '⑨ 시험장에서 반드시 확인할 체크리스트',
      items: checklist(patterns, weakFormulas),
    },
    {
      id: 10,
      title: '⑩ 마지막 응원 메시지',
      items: [CHEER[Math.floor(Date.now() / 86400000) % CHEER.length]],
    },
  ];

  const pageEstimate = Math.min(
    10,
    Math.max(5, 3 + Math.ceil(mustFormulas.length / 15) + Math.ceil(calcPages.length / 8)),
  );

  return {
    id: `final-${subjectId}-${Date.now()}`,
    subjectId,
    title: `${subjectName} Final Book`,
    createdAt: new Date().toISOString(),
    trigger: opts.trigger || 'manual',
    triggerDay: opts.triggerDay ?? null,
    sections,
    formulaRanking: formulas.slice(0, 30),
    weakPatternRanking: patterns.slice(0, 20),
    aiFinalSummary: aiSummary.text,
    condensed,
    examDaySheet: examDay,
    memorySheet: memory,
    quickReview: quick,
    pageCount: pageEstimate,
    entrySourceCount: entries.length,
    predictionForbidden: true,
    schemaVersion: FINAL_BOOK_BUILDER_VERSION,
  };
}

export default {
  FINAL_BOOK_BUILDER_VERSION,
  buildFinalRevisionBook,
};
