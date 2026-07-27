/**
 * Sprint-14B — Recommendation cards (Learning Engine consume)
 */
import { escapeHtml, stars, formatMinutes } from '../../dashboard/dashboard-utils.js';

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
      return `
        <article class="ld-rec-card" tabindex="0">
          <p class="ld-rec-stars" aria-label="priority">${stars(r.priority)}</p>
          <h4>${escapeHtml(r.patternId || r.questionId || '추천')}</h4>
          <p class="ld-card-desc">${escapeHtml(r.reason)}</p>
          <dl class="ld-dl">
            <div><dt>Reason</dt><dd>${escapeHtml(r.reasonCode || '—')}</dd></div>
            <div><dt>Confidence</dt><dd>${escapeHtml(r.confidence || 'Normal')}</dd></div>
            <div><dt>Time</dt><dd>${escapeHtml(formatMinutes(r.estimatedMinutes))}</dd></div>
          </dl>
          <a class="button ld-btn" href="${target}">Start</a>
        </article>`;
    })
    .join('');
  el.innerHTML = `<div class="ld-rec-grid">${cards}</div>`;
}

export default { renderRecommendationList };
