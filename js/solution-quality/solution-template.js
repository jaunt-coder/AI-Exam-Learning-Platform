/**
 * Sprint-15C — Solution Template
 * Student-facing quality card + Reviewer panel templates (HTML strings).
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Student card — shows completeness only (no Reviewer internals).
 */
export function renderStudentQualityCard(report) {
  if (!report) {
    return `<p class="ll-hint">AI 풀이 완성도를 평가하지 못했습니다.</p>`;
  }
  const total = report.qualityScore?.total ?? report.total ?? 0;
  const marks = report.qualityScore?.marks || report.marks || [];
  const rows = marks
    .map(
      (m) => `
      <li class="sq-mark is-${esc(m.mark === '✓' ? 'ok' : m.mark === '△' ? 'mid' : 'bad')}">
        <span class="sq-mark__icon">${esc(m.mark)}</span>
        <span>${esc(m.label)}</span>
      </li>`,
    )
    .join('');

  return `
    <div class="sq-student-card" data-solution-quality="student">
      <p class="sq-kicker">AI 풀이 완성도</p>
      <p class="sq-score"><strong>${esc(total)}</strong><span> / 100</span></p>
      <ul class="sq-marks">${rows}</ul>
    </div>`;
}

/**
 * Reviewer panel — full quality loop (Original → Score → Missing → Suggestion).
 */
export function renderReviewerQualityPanel(report, options = {}) {
  const total = report?.qualityScore?.total ?? 0;
  const missing = report?.missingItems || [];
  const suggestions = report?.improvementSuggestion || report?.suggestion || [];
  const blueprint = report?.blueprint || null;

  const missingList = missing.length
    ? `<ul>${missing.map((m) => `<li><code>${esc(m)}</code></li>`).join('')}</ul>`
    : '<p class="rv-empty">누락 항목 없음</p>';

  const sugList = suggestions.length
    ? `<ul>${suggestions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    : '<p class="rv-empty">개선 제안 없음</p>';

  const bp = blueprint
    ? `<details class="sq-bp">
        <summary>Solution Blueprint</summary>
        <p><strong>Framework</strong>: ${(blueprint.solvingFramework || []).map(esc).join(' · ')}</p>
        <p><strong>Steps</strong>: ${(blueprint.requiredSteps || []).map(esc).join(' → ')}</p>
        <p><strong>Mistakes</strong>: ${(blueprint.commonMistakes || []).map(esc).join(' · ')}</p>
      </details>`
    : '';

  return `
    <div class="sq-reviewer-panel" data-solution-quality="reviewer">
      <p class="sq-kicker">Original AI Solution → Quality Score</p>
      <p class="sq-score"><strong>${esc(total)}</strong> / 100
        ${report?.reviewRequired ? '<span class="sq-badge">Review Required</span>' : ''}
      </p>
      <div class="sq-block">
        <h4>Missing Section</h4>
        ${missingList}
      </div>
      <div class="sq-block">
        <h4>AI Improvement Suggestion</h4>
        ${sugList}
      </div>
      ${bp}
      <div class="sq-actions rv-actions">
        <button type="button" class="button button--primary button--sm" data-sq-act="apply-ai"
          ${options.disableApply ? 'disabled' : ''}>AI 개선 적용</button>
        <button type="button" class="button button--ghost button--sm" data-sq-act="edit">직접 수정</button>
        <button type="button" class="button button--primary button--sm" data-sq-act="approve">승인</button>
      </div>
      <p class="rv-hint">자동 승인 금지 · 승인 시 Override Layer만 사용 (DB 수정 없음)</p>
      <p class="sq-status" data-sq-status hidden></p>
    </div>`;
}

/**
 * Dashboard summary card HTML.
 */
export function renderDashboardQualityCard(aggregate) {
  const avg = aggregate?.average ?? 0;
  const needs = (aggregate?.needsImprove || [])
    .slice(0, 10)
    .map(
      (r) => `
      <li>
        <code>${esc(r.questionId || r.patternId || '—')}</code>
        <span>${esc(r.total)}점</span>
      </li>`,
    )
    .join('');

  return `
    <div class="sq-dash-card">
      <p class="sq-kicker">AI 해설 품질</p>
      <p class="sq-score">평균 <strong>${esc(avg)}</strong>점
        <small>(${esc(aggregate?.count || 0)}건)</small></p>
      <p class="sq-kicker">개선 필요 TOP 10</p>
      <ul class="sq-needs">${needs || '<li>개선 필요 문항 없음</li>'}</ul>
    </div>`;
}

export default {
  renderStudentQualityCard,
  renderReviewerQualityPanel,
  renderDashboardQualityCard,
};
