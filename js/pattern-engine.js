/**
 * AI Exam Learning Platform v2
 * Pattern Learning Engine — 진행률·오답 집계 (Phase 3)
 * data/*.json 읽기 전용 — UI 레이어 Pattern 설명만 코드에 정의
 */

import { loadProgress, loadWrongAnswers, filterQuestionsByPattern } from './question-engine.js';

/** Pattern별 학습 설명 (Frozen DB에 description 필드 없음 — UI fallback) */
export const PATTERN_DESCRIPTIONS = {
  ACC_INV_001:
    'FOB 조건, 위탁·적송·시송 등 거래 형태에 따라 기말재고 포함 여부를 판단하는 Pattern입니다. 소유권 이전 시점이 핵심입니다.',
  ACC_INV_003:
    '재고자산 취득 시 발생하는 운반비·하역비·보험료 등 부대비용의 재고원가 포함 여부와 매입 할인·세금 처리를 다룹니다.',
  ACC_INV_004:
    'PER(매입원가법)을 이용한 매출원가 계산이 핵심입니다. 기초재고·당기매입·기말재고 관계를 정확히 설정해야 합니다.',
  ACC_INV_005:
    '실지재고조사법(PER)과 계속기록법(PR)의 차이, 재고조사 시점과 매출원가 역산 방법을 비교합니다.',
  ACC_INV_006:
    '선입선출법(FIFO)과 총평균법·이동평균법 하에서 매출원가·기말재고를 계산하는 Pattern입니다.',
  ACC_INV_007:
    '순실현가능가치(LCM) 평가, 순매가액·추가원가, 재고자산감소손실 인식을 다루는 Pattern입니다.',
};

/** Pattern별 핵심 학습 포인트 */
export const PATTERN_LEARNING_POINTS = {
  ACC_INV_001: [
    'FOB 선적지 vs FOB 도착지 — 소유권 이전 시점 확인',
    '위탁판매·적송·시송품의 기말재고 포함/제외',
    '운송 중 재고의 귀속 판단',
  ],
  ACC_INV_003: [
    '재고원가 = 매입가 + 취득 관련 부대비용',
    'VAT·매입세 — 재고원가 불포함',
    '매입할인·에누리 — 원가에서 차감',
  ],
  ACC_INV_004: [
    '매출원가 = 기초재고 + 당기매입 - 기말재고',
    'PER법: 기말 실지재고 조사 후 역산',
    '매출원가·매출총이익 연결',
  ],
  ACC_INV_005: [
    'PER = 기말 실사 + 매출원가 역산',
    'PR = 매 거래 잔액 기록',
    '재고조사법 선택에 따른 차이',
  ],
  ACC_INV_006: [
    'FIFO — 먼저 매입한 원가부터 출고',
    '총평균법 — 가중평균 단가 적용',
    '실지재고조사법 vs 계속기록법 조합',
  ],
  ACC_INV_007: [
    'LCM = min(취득원가, NRV)',
    'NRV = 순매가액 - 추가원가',
    '하향 평가 시 재고자산감소손실',
  ],
};

/**
 * Pattern 풀이 진행률
 * @param {string} patternId
 * @param {array} questions
 * @param {object} [progress]
 */
export function getPatternProgress(patternId, questions, progress = loadProgress()) {
  const qs = filterQuestionsByPattern(questions, patternId);
  const answered = qs.filter((q) => progress.answered[q.questionId]);
  const correct = qs.filter((q) => progress.answered[q.questionId]?.correct);

  return {
    total: qs.length,
    answered: answered.length,
    correct: correct.length,
    progressPercent: qs.length ? Math.round((answered.length / qs.length) * 100) : 0,
    correctPercent: answered.length ? Math.round((correct.length / answered.length) * 100) : 0,
  };
}

/**
 * questionId 기반 wrongAnswers → patternId 집계
 * @param {object} [wrongStore]
 */
export function aggregateWrongByPattern(wrongStore = loadWrongAnswers()) {
  const byPattern = {};

  for (const item of Object.values(wrongStore.items || {})) {
    const pid = item.patternId;
    if (!pid) continue;

    if (!byPattern[pid]) {
      byPattern[pid] = {
        patternId: pid,
        questionCount: 0,
        totalWrongCount: 0,
        items: [],
      };
    }

    byPattern[pid].questionCount += 1;
    byPattern[pid].totalWrongCount += item.wrongCount || 1;
    byPattern[pid].items.push(item);
  }

  return byPattern;
}

/**
 * @param {array} statistics
 * @param {string} patternId
 */
export function getStatisticsForPattern(statistics, patternId) {
  return statistics.find((s) => s.patternId === patternId) || null;
}

/**
 * @param {string} patternId
 */
export function getPatternDescription(patternId) {
  return PATTERN_DESCRIPTIONS[patternId] || '재고자산 출제 Pattern입니다.';
}

/**
 * @param {string} patternId
 * @returns {string[]}
 */
export function getPatternLearningPoints(patternId) {
  return PATTERN_LEARNING_POINTS[patternId] || ['핵심 개념과 기출 유형을 정리하세요.'];
}

/**
 * importance(60~95) → 1~5 별
 * @param {number} importance
 */
export function toStarRating(importance) {
  const stars = Math.min(5, Math.max(1, Math.round((importance || 70) / 20)));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

/**
 * Pattern 목록을 grade·importance 기준 정렬
 * @param {array} patterns
 */
export function sortPatterns(patterns) {
  const gradeOrder = { S: 0, A: 1, B: 2, C: 3 };
  return [...patterns].sort((a, b) => {
    const ga = gradeOrder[a.grade] ?? 9;
    const gb = gradeOrder[b.grade] ?? 9;
    if (ga !== gb) return ga - gb;
    return (b.importance || 0) - (a.importance || 0);
  });
}

/**
 * Pattern별 전체 Dashboard 요약
 * @param {array} patterns
 * @param {array} questions
 */
export function buildDashboardSummary(patterns, questions) {
  const progress = loadProgress();
  const wrongByPattern = aggregateWrongByPattern();

  let totalQuestions = 0;
  let totalAnswered = 0;
  let totalWrongPatterns = 0;

  const patternStats = patterns.map((pattern) => {
    const prog = getPatternProgress(pattern.patternId, questions, progress);
    const wrong = wrongByPattern[pattern.patternId];
    totalQuestions += prog.total;
    totalAnswered += prog.answered;
    if (wrong?.questionCount) totalWrongPatterns += 1;

    return { pattern, progress: prog, wrong: wrong || null };
  });

  return {
    patternStats,
    totalQuestions,
    totalAnswered,
    overallProgressPercent: totalQuestions
      ? Math.round((totalAnswered / totalQuestions) * 100)
      : 0,
    wrongPatternCount: totalWrongPatterns,
    totalWrongQuestions: Object.keys(loadWrongAnswers().items).length,
  };
}
