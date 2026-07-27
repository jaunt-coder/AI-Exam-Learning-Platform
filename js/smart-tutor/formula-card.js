/**
 * Sprint-15B — Formula Card
 * Formula Engine 출력을 암기용 카드 체인 UI 데이터로 변환.
 * Runtime / Formula Engine 계산식은 변경하지 않음.
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { generateFormulas } from '../solution-engine/formula-engine.js';
import { persistFormulaCard } from './cache.js';

/** Pattern별 암기 체인 (공식 데이터 기반 표현, DB 미수정) */
const MEMORY_CHAINS = {
  ACC_INV_006: ['FIFO', '기말재고', '최근 매입분', '매출원가', '오래된 재고'],
  ACC_INV_001: ['소유권', 'FOB·위탁·적송·시송', '포함/제외', '실사액 조정', '기말재고'],
  ACC_INV_004: ['기초', '매입', '기말', '매출원가', '이익'],
  ACC_INV_005: ['장부수량', '실사수량', '감모', '매출원가', '실제수량'],
  ACC_INV_007: ['취득원가', 'NRV', 'min', '평가손실', '기말재고'],
  ACC_INV_003: ['매입가', '정상원가', '비정상낭비·판매비 제외', '저가법', '재고원가'],
};

/**
 * @param {object} question
 * @param {object|null} pattern
 * @param {object[]|null} formulasFromEngine — optional precomputed generateFormulas()
 */
export function buildFormulaCard(question = {}, pattern = null, formulasFromEngine = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const patternName = pattern?.name || PATTERN_NAMES[patternId] || patternId || '재고자산';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const formulas = Array.isArray(formulasFromEngine) && formulasFromEngine.length
    ? formulasFromEngine
    : generateFormulas(question, pattern);

  const chain = MEMORY_CHAINS[patternId]
    || [
      patternName.split(/[·・]/)[0] || patternName,
      ...(formulas[0]?.formula || '')
        .split(/[·・=→]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    ].slice(0, 5);

  const primary = formulas[0] || {
    name: `${patternName} 핵심 공식`,
    formula: profile?.solvingAlgorithm?.[0] || 'Pattern 공식을 단계로 암기한다.',
    when: '해당 Pattern 문항',
  };

  const card = {
    title: '공식 카드',
    purpose: '암기',
    headline: chain[0] || patternName,
    chain: chain.map((label, i) => ({
      order: i + 1,
      label,
      isLast: i === chain.length - 1,
    })),
    formulas: formulas.map((f) => ({
      name: f.name,
      formula: f.formula,
      when: f.when,
    })),
    primaryFormula: primary.formula,
    primaryName: primary.name,
    patternId,
    patternName,
    source: 'formula-engine',
  };

  if (patternId) persistFormulaCard(patternId, card);
  return card;
}

export function renderFormulaCardHtml(card, esc) {
  if (!card) return '<p class="ll-hint">공식 카드가 없습니다.</p>';
  const e = esc || ((s) => String(s ?? ''));
  const chain = (card.chain || [])
    .map(
      (node, i) => `
      <li class="st-formula-node">
        <span class="st-formula-node__label">${e(node.label)}</span>
        ${i < (card.chain.length - 1) ? '<span class="st-formula-arrow" aria-hidden="true">↓</span>' : ''}
      </li>`,
    )
    .join('');

  const extras = (card.formulas || [])
    .slice(0, 3)
    .map(
      (f) => `
      <li class="st-formula-item">
        <strong>${e(f.name)}</strong>
        <code>${e(f.formula)}</code>
      </li>`,
    )
    .join('');

  return `
    <div class="st-formula-card" data-purpose="암기">
      <p class="st-formula-card__kicker">공식 · ${e(card.purpose || '암기')}</p>
      <p class="st-formula-card__headline">${e(card.headline)}</p>
      <ol class="st-formula-chain">${chain}</ol>
      ${extras ? `<ul class="st-formula-list">${extras}</ul>` : ''}
    </div>`;
}

export default {
  buildFormulaCard,
  renderFormulaCardHtml,
  MEMORY_CHAINS,
};
