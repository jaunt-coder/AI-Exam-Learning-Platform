/**
 * Sprint-14B — Recent Activity
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';

export function renderRecentActivity(el, activity = []) {
  if (!el) return;
  if (!activity.length) {
    el.innerHTML = '<p class="ld-empty">최근 풀이 기록이 없습니다.</p>';
    return;
  }
  const rows = activity
    .map(
      (a) => `
      <tr>
        <td><a href="question.html?id=${encodeURIComponent(a.questionId)}">${escapeHtml(a.questionId)}</a></td>
        <td><span class="ld-chip ld-chip--${a.result === 'OK' ? 'ok' : 'bad'}">${escapeHtml(a.result)}</span></td>
        <td>${escapeHtml(String(a.time).replace('T', ' ').slice(0, 16))}</td>
        <td>${a.reviewed ? 'Y' : 'N'}</td>
      </tr>`,
    )
    .join('');
  el.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table" aria-label="Recent Activity">
        <thead>
          <tr><th>Question</th><th>Result</th><th>Time</th><th>Review</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export default { renderRecentActivity };
