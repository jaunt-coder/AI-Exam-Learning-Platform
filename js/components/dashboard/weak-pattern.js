/**
 * Sprint-14B — Weak Pattern list
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';

export function renderWeakPattern(el, weakPatterns = []) {
  if (!el) return;
  if (!weakPatterns.length) {
    el.innerHTML = '<p class="ld-empty">취약 Pattern이 없습니다.</p>';
    return;
  }
  const rows = weakPatterns
    .map(
      (wp) => `
      <tr>
        <td><code>${escapeHtml(wp.patternId)}</code></td>
        <td>${escapeHtml(wp.mastery)}%</td>
        <td>${escapeHtml(wp.wrongCount)}회 오답</td>
        <td>${escapeHtml(String(wp.lastAttempt).slice(0, 10))}</td>
        <td>
          <a class="button button--ghost ld-btn" href="pattern.html?id=${encodeURIComponent(wp.patternId || '')}">복습</a>
        </td>
      </tr>`,
    )
    .join('');
  el.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table" aria-label="Weak Pattern Top 10">
        <thead>
          <tr><th>Pattern</th><th>Mastery</th><th>Wrong</th><th>최근</th><th>Review</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export default { renderWeakPattern };
