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
 * 시험 Trigger Keyword (UI enrichment — D4 미변경)
 * keyword → short judgment cue
 * @type {Record<string, Array<{ keyword: string, cue: string }>>}
 */
export const PATTERN_TRIGGER_KEYWORDS = {
  ACC_INV_001: [
    { keyword: 'FOB 선적지', cue: '선적 시점 소유권 이전' },
    { keyword: 'FOB 도착지', cue: '도착 시점 소유권 이전' },
    { keyword: '위탁판매', cue: '판매 전 위탁자 재고' },
    { keyword: '적송·시송', cue: '미판매·의사표시 기준으로 포함/제외' },
  ],
  ACC_INV_003: [
    { keyword: '부대비용', cue: '취득·완성 필요원가면 재고원가 포함' },
    { keyword: 'VAT·매입세', cue: '재고원가 불포함' },
    { keyword: '매입할인·에누리', cue: '원가에서 차감' },
    { keyword: '비정상낭비·판매비', cue: '발생기간 비용 (원가 X)' },
  ],
  ACC_INV_004: [
    { keyword: '기초·매입·기말', cue: '항등식: 기초+매입−기말=매출원가' },
    { keyword: '매출총이익률', cue: '매출원가 역산 → 기말재고 추정' },
    { keyword: '매입채무·현금', cue: '현금흐름으로 매입액 되짚기' },
  ],
  ACC_INV_005: [
    { keyword: '실지재고조사법(PER)', cue: '기말 실사로 재고 확정' },
    { keyword: '계속기록법(PR)', cue: '매 거래 장부잔액 유지' },
    { keyword: '감모', cue: '장부수량 − 실사수량' },
  ],
  ACC_INV_006: [
    { keyword: 'FIFO', cue: '먼저 들어온 원가부터 출고' },
    { keyword: '총평균법', cue: '(기초+매입) 원가÷수량 단가' },
    { keyword: '실지 vs 계속', cue: 'FIFO는 동일, 평균만 갈림' },
  ],
  ACC_INV_007: [
    { keyword: 'LCM', cue: 'min(취득원가, NRV)' },
    { keyword: 'NRV', cue: '순매가액 − 추가원가' },
    { keyword: '소매재고법', cue: '원가율 × 매가기준 기말재고' },
    { keyword: '저가기준 원가율', cue: '분모에서 순인하 제외' },
  ],
};

/**
 * 핵심 판단 기준: Keyword → 판단 기준 → 결론 (UI enrichment)
 * @type {Record<string, Array<{ keyword: string, criterion: string, conclusion: string }>>}
 */
export const PATTERN_JUDGMENT_CRITERIA = {
  ACC_INV_001: [
    {
      keyword: 'FOB 선적지',
      criterion: '기말 시점 운송 중인가?',
      conclusion: '운송 중이면 매입자 재고(선적 시 소유권 이전)',
    },
    {
      keyword: 'FOB 도착지',
      criterion: '기말 시점 도착 완료인가?',
      conclusion: '미도착(운송 중)이면 판매자 재고',
    },
    {
      keyword: '위탁·적송',
      criterion: '기말 현재 판매 완료 여부',
      conclusion: '미판매분만 위탁자(본인) 재고',
    },
  ],
  ACC_INV_003: [
    {
      keyword: '운반·하역·보험',
      criterion: '재고 취득·완성까지 필요한가?',
      conclusion: '필요하면 재고원가 포함',
    },
    {
      keyword: 'VAT',
      criterion: '환급·공제 대상 세금인가?',
      conclusion: '재고원가에 넣지 않음',
    },
    {
      keyword: '비정상낭비',
      criterion: '정상 조업 범위인가?',
      conclusion: '비정상이면 당기 비용',
    },
  ],
  ACC_INV_004: [
    {
      keyword: '항등식',
      criterion: '기초·매입·기말·매출원가 중 미지수는?',
      conclusion: '기초+매입−기말=매출원가로 역산',
    },
    {
      keyword: '이익률',
      criterion: '매출 기준인가 원가 기준인가?',
      conclusion: '분모(매출 vs 원가)를 확정한 뒤 매출원가 산출',
    },
  ],
  ACC_INV_005: [
    {
      keyword: 'PER',
      criterion: '기말 실사 자료가 있는가?',
      conclusion: '실사 기말재고로 매출원가 역산',
    },
    {
      keyword: 'PR',
      criterion: '매출마다 원가 기록이 있는가?',
      conclusion: '장부 재고·매출원가 사용, 감모는 별도',
    },
  ],
  ACC_INV_006: [
    {
      keyword: 'FIFO',
      criterion: '출고 순서(먼저 매입분)를 따르는가?',
      conclusion: '오래된 단가부터 매출원가 배분',
    },
    {
      keyword: '총평균',
      criterion: '기초+당기매입 수량·금액이 완전한가?',
      conclusion: '가중평균 단가로 매출·기말 동일 적용',
    },
  ],
  ACC_INV_007: [
    {
      keyword: 'LCM',
      criterion: '취득원가와 NRV 중 낮은 쪽은?',
      conclusion: '낮은 금액으로 평가, 차액은 평가손실',
    },
    {
      keyword: 'NRV',
      criterion: '추가 완성·판매비를 차감했는가?',
      conclusion: '순매가액 − 추가원가 = NRV',
    },
    {
      keyword: '소매재고법',
      criterion: '원가율 종류(평균/FIFO/저가)는?',
      conclusion: '해당 원가율 × 매가기준 기말재고',
    },
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
 * @param {string} patternId
 * @returns {Array<{ keyword: string, cue: string }>}
 */
export function getPatternTriggerKeywords(patternId) {
  return PATTERN_TRIGGER_KEYWORDS[patternId] || [];
}

/**
 * @param {string} patternId
 * @returns {Array<{ keyword: string, criterion: string, conclusion: string }>}
 */
export function getPatternJudgmentCriteria(patternId) {
  return PATTERN_JUDGMENT_CRITERIA[patternId] || [];
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
