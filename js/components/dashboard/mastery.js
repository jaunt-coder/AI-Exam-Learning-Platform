/**
 * Sprint-14B — Mastery Summary (donut trio)
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';
import { drawDonut } from '../../dashboard/dashboard-chart.js';

export function renderMasterySummary(el, mastery) {
  if (!el) return;
  const m = mastery || { question: 0, pattern: 0, chapter: 0 };
  el.innerHTML = `
    <div class="ld-mastery-grid" role="list">
      <div class="ld-mastery-item" role="listitem">
        <canvas id="donut-question" width="140" height="120" aria-label="Question Mastery ${m.question}%"></canvas>
        <p><strong>Question</strong><br>${escapeHtml(m.question)}%</p>
      </div>
      <div class="ld-mastery-item" role="listitem">
        <canvas id="donut-pattern" width="140" height="120" aria-label="Pattern Mastery ${m.pattern}%"></canvas>
        <p><strong>Pattern</strong><br>${escapeHtml(m.pattern)}%</p>
      </div>
      <div class="ld-mastery-item" role="listitem">
        <canvas id="donut-chapter" width="140" height="120" aria-label="Chapter Mastery ${m.chapter}%"></canvas>
        <p><strong>Chapter</strong><br>${escapeHtml(m.chapter)}%</p>
      </div>
    </div>
  `;
  drawDonut(el.querySelector('#donut-question'), m.question);
  drawDonut(el.querySelector('#donut-pattern'), m.pattern, { color: '#12b76a' });
  drawDonut(el.querySelector('#donut-chapter'), m.chapter, { color: '#f79009' });
}

export default { renderMasterySummary };
