/**
 * Sprint-15A+ — Calculation Engine
 * Line-by-line calculation process for calculation-type questions.
 */

import { PATTERN_TUTOR_PROFILES } from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';

/**
 * Detect whether question looks calculation-oriented.
 */
export function isCalculationQuestion(question = {}) {
  const stem = `${question.question || ''} ${question.originalQuestion || ''} ${question.solution || ''}`;
  if (/\d/.test(stem) && /(원|단가|수량|매출원가|기말|평균|FIFO|LCM|원가율|%)/.test(stem)) {
    return true;
  }
  const pid = question.patternId || '';
  return ['ACC_INV_004', 'ACC_INV_005', 'ACC_INV_006', 'ACC_INV_007'].includes(pid);
}

/**
 * Build calculation sections (title + lines).
 * @returns {{ title: string, lines: string[], markdownTable?: string }[]}
 */
export function generateCalculationProcess(question = {}, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;

  if (!isCalculationQuestion(question) && !template) {
    return [
      {
        title: '계산 과정',
        lines: [
          '본 문항은 개념·판단 중심입니다. 수치 계산보다 조건 분류가 우선입니다.',
          '필요 시 보기 금액만 대조하고, Pattern 판단 트리를 먼저 적용하세요.',
        ],
      },
    ];
  }

  if (patternId === 'ACC_INV_006') {
    return [
      {
        title: '평균단가 계산',
        lines: [
          '평균단가 = (기초재고원가 + 당기매입원가) ÷ (기초수량 + 매입수량)',
          '분자·분모에 기초와 당기매입을 모두 포함한다 (총평균법).',
          '구한 평균단가를 매출수량·기말수량에 동일 적용한다.',
        ],
        markdownTable:
          '| 구분 | 수량 | 단가 | 금액 |\n| --- | ---: | ---: | ---: |\n| 기초 | (문제) | (문제) | 수량×단가 |\n| 매입 | (문제) | (문제) | 수량×단가 |\n| 합계 | 합 | — | 합 → 평균단가 |',
      },
      {
        title: '기말재고 계산',
        lines: [
          'FIFO: 최근 입고분부터 잔량에 배정한다.',
          '총평균: 기말수량 × 평균단가.',
          '기말재고 = 판매가능원가 − 매출원가 로 교차 검증한다.',
        ],
      },
      {
        title: '매출원가 계산',
        lines: [
          'FIFO: 먼저 들어온 원가부터 출고 수량만큼 합산.',
          '총평균: 매출수량 × 평균단가.',
          '판매가능원가 = 기초 + 매입, 매출원가 = 판매가능 − 기말.',
        ],
      },
    ];
  }

  if (patternId === 'ACC_INV_004') {
    return [
      {
        title: '매출원가 계산',
        lines: [
          '매출원가 = 매출액 × (1 − 매출총이익률)  (추정형)',
          '또는 매출원가 = 기초재고 + 당기매입 − 기말재고',
        ],
      },
      {
        title: '기말재고 계산',
        lines: [
          '기말재고 = 기초재고 + 당기매입 − 매출원가',
          '단위(원/천원)와 순액(에누리·할인) 반영 여부를 확인한다.',
        ],
      },
    ];
  }

  if (patternId === 'ACC_INV_007') {
    return [
      {
        title: 'NRV·저가법 계산',
        lines: [
          'NRV = 예상판매가 − 추가완성·판매비',
          '항목별 평가액 = min(취득원가, NRV)',
          '평가손실 = Σ 수량 × max(0, 취득원가 − NRV)',
        ],
      },
      {
        title: '소매재고법 (해당 시)',
        lines: template?.steps || [
          '원가율 = 원가합계 ÷ 매가합계',
          '기말재고(원가) = 기말재고(매가) × 원가율',
        ],
      },
    ];
  }

  const steps = template?.steps || profile?.solvingAlgorithm || [];
  return [
    {
      title: template?.title || '계산 과정',
      lines: steps.length
        ? steps.map((s, i) => `${i + 1}. ${s}`)
        : ['지문의 수치를 표로 정리한 뒤 Pattern 공식을 한 줄씩 적용한다.'],
      markdownTable: null,
    },
  ];
}

export default {
  isCalculationQuestion,
  generateCalculationProcess,
};
