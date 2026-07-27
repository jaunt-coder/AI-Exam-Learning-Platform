/**
 * Sprint-15A+ — Misconception Engine
 * Explains the concept gap revealed by this attempt (3~5 lines).
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';

/**
 * @param {object} question
 * @param {object|null} diagnosis
 * @param {object|null} pattern
 * @returns {{ title: string, lines: string[], patternId: string }}
 */
export function analyzeMisconception(question = {}, diagnosis = null, pattern = null) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const name = pattern?.name || PATTERN_NAMES[patternId] || patternId;
  const primaryCode = diagnosis?.primary?.code || '';

  if (diagnosis?.isCorrect) {
    return {
      title: '오개념 점검',
      lines: [
        '이번 문항은 정답입니다.',
        `「${name}」 Pattern의 핵심 개념을 잘 적용했습니다.`,
        profile?.memoryTip
          ? String(profile.memoryTip).split('\n')[0]
          : '같은 Pattern의 변형 문제에서도 동일 절차를 유지하세요.',
      ],
      patternId,
    };
  }

  const lines = [];

  if (patternId === 'ACC_INV_006') {
    if (primaryCode === 'FIFO_ERROR') {
      lines.push('FIFO에서는 기초재고부터 먼저 출고된다.');
      lines.push('나중에 들어온 원가는 기말재고에 남는 경우가 많다.');
      lines.push('총평균법과 출고 순서를 섞으면 매출원가가 어긋난다.');
    } else if (primaryCode === 'AVG_COST_ERROR') {
      lines.push('총평균법 평균단가는 (기초원가+매입원가)÷(기초수량+매입수량)이다.');
      lines.push('기초를 빼고 당기매입만으로 단가를 내면 오답이다.');
      lines.push('구한 단가를 매출·기말에 동일하게 적용해야 한다.');
    } else {
      lines.push('FIFO는 먼저 들어온 원가부터, 총평균은 가중평균 단가로 출고한다.');
      lines.push('실지재고조사법의 총평균과 계속기록법의 이동평균을 구분해야 한다.');
      lines.push('방법 이름을 확인한 뒤 표를 그리고 계산한다.');
    }
  } else if (patternId === 'ACC_INV_001') {
    lines.push('기말재고는 “창고에 있는 것”이 아니라 “소유권이 있는 것”이다.');
    lines.push('FOB 선적/도착, 위탁·적송·시송 조건을 빠뜨리면 포함·제외가 뒤집힌다.');
    lines.push('각 거래를 포함/제외로 표시한 뒤 실사액에 가감한다.');
  } else if (patternId === 'ACC_INV_004') {
    lines.push('기초 + 매입 − 기말 = 매출원가 항등식을 먼저 세운다.');
    lines.push('매출총이익률은 보통 매출 기준이며, 원가가산율과 분모가 다르다.');
    lines.push('기말재고를 더하거나 빼는 부호 실수가 잦다.');
  } else {
    lines.push(
      profile?.explanation
        ? String(profile.explanation).slice(0, 160)
        : `「${name}」 Pattern의 핵심 개념이 부족했을 수 있습니다.`,
    );
    lines.push(
      profile?.frequentlyConfusedWith
        || '비슷한 Pattern과 혼동하지 않도록 판단 기준을 한 줄로 정리하세요.',
    );
    lines.push(
      profile?.similarTrap
        || '시험장 함정: 조건·방법을 반대로 적용하는 보기가 자주 출제됩니다.',
    );
  }

  if (profile?.wrongReasons && primaryCode) {
    const reasonValues = Object.values(profile.wrongReasons);
    if (reasonValues[0] && lines.length < 5) {
      lines.push(String(reasonValues[0]));
    }
  }

  while (lines.length < 3) {
    lines.push('틀린 원인을 Pattern 알고리즘으로 다시 추적하세요.');
  }

  return {
    title: '오개념 분석',
    lines: lines.slice(0, 5),
    patternId,
  };
}

export default {
  analyzeMisconception,
};
