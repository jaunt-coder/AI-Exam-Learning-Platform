/**
 * Sprint-14B — Recommendation cards (Learning Engine consume)
 * Sprint-14C — Evidence badge / detail (explainability only)
 */
import { escapeHtml, stars, formatMinutes } from '../../dashboard/dashboard-utils.js';
import {
  renderEvidenceBadge,
  renderEvidenceDetail,
  bindEvidenceAccordion,
} from '../../evidence/evidence-renderer.js';

export function renderRecommendationList(el, recommendations = []) {
  if (!el) return;
  if (!recommendations.length) {
    el.innerHTML = '<p class="ld-empty">오늘 추천이 없습니다.</p>';
    return;
  }
  const cards = recommendations
    .slice(0, 8)
    .map((r) => {
      const target = r.questionId
        ? `question.html?id=${encodeURIComponent(r.questionId)}`
        : r.patternId
          ? `pattern.html?id=${encodeURIComponent(r.patternId)}`
          : 'recommendation.html';
      const ev = r.evidence || null;
      const summary = r.evidenceSummary || '';
      return `
        <article class="ld-rec-card" tabindex="0">
          <p class="ld-rec-stars" aria-label="priority">${stars(r.priority)}</p>
          <h4>${escapeHtml(r.patternId || r.questionId || '추천')} ${ev ? renderEvidenceBadge(ev) : ''}</h4>
          <p class="ld-card-desc">${escapeHtml(r.reason)}</p>
          <dl class="ld-dl">
            <div><dt>Reason</dt><dd>${escapeHtml(r.reasonCode || '—')}</dd></div>
            <div><dt>Confidence</dt><dd>${escapeHtml(r.confidence || 'Normal')}</dd></div>
            <div><dt>Time</dt><dd>${escapeHtml(formatMinutes(r.estimatedMinutes))}</dd></div>
          </dl>
          <a class="button ld-btn" href="${target}">Start</a>
          ${ev ? `<div class="ev-rec-evidence">${renderEvidenceDetail(ev, summary, { expanded: false })}</div>` : ''}
        </article>`;
    })
    .join('');
  el.innerHTML = `<div class="ld-rec-grid">${cards}</div>`;
  bindEvidenceAccordion(el);
}

export default { renderRecommendationList };
