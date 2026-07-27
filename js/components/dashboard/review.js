/**
 * Sprint-14B — Today's Review board
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';

function listBlock(title, items, tone) {
  if (!items?.length) {
    return `
      <div class="ld-review-col ld-review-col--${tone}">
        <h4>${escapeHtml(title)}</h4>
        <p class="ld-empty">없음</p>
      </div>`;
  }
  const lis = items
    .slice(0, 8)
    .map(
      (r) => `
      <li>
        <a href="question.html?id=${encodeURIComponent(r.questionId)}">${escapeHtml(r.questionId)}</a>
        <span class="ld-chip">${escapeHtml(`S${r.stage ?? 0}`)}</span>
      </li>`,
    )
    .join('');
  return `
    <div class="ld-review-col ld-review-col--${tone}">
      <h4>${escapeHtml(title)} (${items.length})</h4>
      <ul class="ld-review-list">${lis}</ul>
    </div>`;
}

export function renderReviewBoard(el, board) {
  if (!el) return;
  const b = board || { today: [], overdue: [], upcoming: [], past: [] };
  el.innerHTML = `
    <div class="ld-review-board" role="group" aria-label="Today's Review">
      ${listBlock('오늘 복습', b.today, 'today')}
      ${listBlock('Overdue', b.overdue, 'overdue')}
      ${listBlock('다음 복습', b.upcoming, 'next')}
      ${listBlock('지난 복습', b.past, 'past')}
    </div>
  `;
}

export default { renderReviewBoard };
