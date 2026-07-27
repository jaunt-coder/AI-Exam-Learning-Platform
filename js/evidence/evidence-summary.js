/**
 * Sprint-14C — Evidence Summary (natural-language explanation)
 */

import { loadEvidenceSummaryDoc, saveEvidenceSummaryDoc } from './evidence-storage.js';

/**
 * @param {object} evidence
 * @returns {string}
 */
export function buildEvidenceSummary(evidence = {}) {
  const wrong = evidence.types?.wrongHistory;
  const mastery = evidence.types?.mastery;
  const review = evidence.types?.reviewCycle;
  const confidence = evidence.types?.confidence;
  const days = wrong?.lastDays;
  const incorrect = Number(wrong?.incorrect) || 0;
  const attempts = Number(wrong?.attempts) || 0;
  const qScore = Number(mastery?.question) || 0;

  const parts = [];
  if (attempts > 0) {
    parts.push(`최근 ${attempts}회 중 오답 ${incorrect}회이며 Mastery가 ${qScore}%입니다.`);
  } else {
    parts.push(`아직 풀이 기록이 적고 Mastery가 ${qScore}%입니다.`);
  }
  if (days != null) {
    parts.push(`마지막 풀이가 ${days}일 전이라 지금 복습 효과가 가장 큽니다.`);
  } else if (review?.due) {
    parts.push('오늘 복습 주기가 도래했습니다.');
  }
  if (confidence?.low) {
    parts.push(`Confidence가 ${confidence.level}이라 집중 학습이 필요합니다.`);
  }
  return parts.join(' ');
}

export function persistEvidenceSummary(evidenceId, summary, meta = {}) {
  const doc = loadEvidenceSummaryDoc();
  doc.byId[evidenceId] = {
    summary,
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  saveEvidenceSummaryDoc(doc);
  return doc.byId[evidenceId];
}

export function getPersistedSummary(evidenceId) {
  return loadEvidenceSummaryDoc().byId?.[evidenceId] || null;
}

export default {
  buildEvidenceSummary,
  persistEvidenceSummary,
  getPersistedSummary,
};
