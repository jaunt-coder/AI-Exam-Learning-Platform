/**
 * Sprint-14B — Dashboard Card shell
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';

export function renderCardShell({ title, desc, body, wide = false }) {
  return `
    <article class="ld-card card ${wide ? 'ld-card--wide' : ''} ld-student-card" role="region" aria-label="${escapeHtml(title)}">
      <h3>${escapeHtml(title)}</h3>
      ${desc ? `<p class="ld-card-desc">${escapeHtml(desc)}</p>` : ''}
      <div class="ld-card-body">${body || ''}</div>
    </article>
  `;
}

export default { renderCardShell };
