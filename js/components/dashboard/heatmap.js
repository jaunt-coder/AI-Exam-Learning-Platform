/**
 * Sprint-14B — GitHub-style Learning Heatmap
 */
import { escapeHtml } from '../../dashboard/dashboard-utils.js';

function level(solved) {
  if (solved <= 0) return 0;
  if (solved <= 2) return 1;
  if (solved <= 5) return 2;
  if (solved <= 10) return 3;
  return 4;
}

export function renderHeatmap(el, days = []) {
  if (!el) return;
  const cells = days
    .map((d) => {
      const lv = level(d.solved);
      const title = `${d.date} · Solved ${d.solved} · Correct ${d.correct}`;
      return `<button type="button" class="ld-heat-cell ld-heat-cell--${lv}"
        title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"
        data-date="${escapeHtml(d.date)}" data-solved="${d.solved}" data-correct="${d.correct}"></button>`;
    })
    .join('');

  el.innerHTML = `
    <div class="ld-heatmap-wrap">
      <div class="ld-heatmap" role="img" aria-label="최근 365일 학습 Heatmap">${cells}</div>
      <p class="ld-heatmap-tip" id="heatmap-tip" aria-live="polite">셀에 마우스를 올리면 날짜별 풀이량이 표시됩니다.</p>
      <div class="ld-heat-legend" aria-hidden="true">
        <span>Less</span>
        <span class="ld-heat-cell ld-heat-cell--0"></span>
        <span class="ld-heat-cell ld-heat-cell--1"></span>
        <span class="ld-heat-cell ld-heat-cell--2"></span>
        <span class="ld-heat-cell ld-heat-cell--3"></span>
        <span class="ld-heat-cell ld-heat-cell--4"></span>
        <span>More</span>
      </div>
    </div>
  `;

  const tip = el.querySelector('#heatmap-tip');
  el.querySelectorAll('.ld-heat-cell[data-date]').forEach((btn) => {
    const show = () => {
      if (!tip) return;
      tip.textContent = `${btn.dataset.date} · Solved ${btn.dataset.solved} · Correct ${btn.dataset.correct}`;
    };
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('focus', show);
  });
}

export default { renderHeatmap };
