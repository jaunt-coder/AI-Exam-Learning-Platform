/**
 * Sprint-14C — Evidence Renderer (UI markup only)
 */

import { escapeHtml, toneLabel } from './evidence-utils.js';

export function renderEvidenceBadge(evidence) {
  if (!evidence) return '';
  const tone = evidence.score?.tone || 'yellow';
  const total = evidence.score?.total ?? 0;
  return `
    <span class="ev-badge ev-badge--${tone}" title="Evidence Score ${total}"
          role="status" aria-label="Evidence ${toneLabel(tone)} ${total}점">
      Evidence ${total}
    </span>
  `;
}

export function renderEvidenceSummaryBlock(summary, evidence) {
  return `
    <div class="ev-summary" role="note">
      <p>${escapeHtml(summary || '')}</p>
      <p class="ev-benefit" aria-label="Estimated Benefit">Estimated Benefit ${escapeHtml(evidence?.estimatedBenefit || '')}</p>
    </div>
  `;
}

export function renderEvidenceChecklist(evidence) {
  const items = evidence?.checklist || [];
  if (!items.length) {
    return '<p class="ev-empty">표시할 Evidence가 없습니다.</p>';
  }
  const lis = items
    .map((b) => `<li class="ev-check">${escapeHtml(b.text)}</li>`)
    .join('');
  return `<ul class="ev-checklist" role="list">${lis}</ul>`;
}

export function renderEvidenceScoreBars(evidence) {
  const rows = (evidence?.score?.breakdown || [])
    .map(
      (row) => `
      <div class="ev-score-row">
        <span>${escapeHtml(row.type)}</span>
        <strong>${escapeHtml(row.points)} / ${escapeHtml(row.max)}</strong>
        <div class="ev-score-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${row.max}" aria-valuenow="${row.points}" aria-label="${escapeHtml(row.type)}">
          <span style="width:${row.max ? Math.round((row.points / row.max) * 100) : 0}%"></span>
        </div>
      </div>`,
    )
    .join('');
  return `
    <div class="ev-score" aria-label="Evidence Score ${evidence?.score?.total ?? 0}">
      <p class="ev-score-total"><strong>Total ${escapeHtml(evidence?.score?.total ?? 0)}</strong>
        <span class="ev-badge ev-badge--${evidence?.score?.tone || 'yellow'}">${escapeHtml(toneLabel(evidence?.score?.tone))}</span>
      </p>
      ${rows}
    </div>
  `;
}

export function renderEvidenceDetail(evidence, summary, options = {}) {
  if (!evidence) {
    return '<div class="ev-panel"><p class="ev-empty">Evidence를 생성하지 못했습니다.</p></div>';
  }
  const expanded = options.expanded !== false;
  return `
    <div class="ev-panel ev-panel--${evidence.score?.tone || 'yellow'}" data-evidence-id="${escapeHtml(evidence.evidenceId)}">
      <div class="ev-panel__head">
        ${renderEvidenceBadge(evidence)}
        <button type="button" class="button button--ghost ev-toggle" aria-expanded="${expanded}" data-ev-toggle>
          ${expanded ? '접기' : '펼치기'}
        </button>
      </div>
      ${renderEvidenceSummaryBlock(summary, evidence)}
      <div class="ev-panel__body" ${expanded ? '' : 'hidden'}>
        ${renderEvidenceChecklist(evidence)}
        ${renderEvidenceScoreBars(evidence)}
        <div class="ev-timeline" aria-label="Evidence Timeline">
          <p><strong>Question</strong> ${escapeHtml(evidence.questionId || '—')}</p>
          <p><strong>Pattern</strong> ${escapeHtml(evidence.patternId || '—')}</p>
          <p><strong>Reason</strong> ${escapeHtml(evidence.types?.recommendationReason?.label || '—')}</p>
          <p><strong>Generated</strong> ${escapeHtml(String(evidence.generatedAt || '').replace('T', ' ').slice(0, 19))}</p>
        </div>
      </div>
    </div>
  `;
}

export function renderWhyRecommendedButton() {
  return `
    <button type="button" class="button button--ghost ev-why-btn" id="why-recommended-btn"
            aria-expanded="false" aria-controls="why-recommended-panel">
      Why Recommended?
    </button>
    <div id="why-recommended-panel" class="ev-why-panel" hidden aria-live="polite"></div>
  `;
}

export function bindEvidenceAccordion(root) {
  if (!root) return;
  root.querySelectorAll('[data-ev-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.ev-panel');
      const body = panel?.querySelector('.ev-panel__body');
      if (!body) return;
      const open = body.hasAttribute('hidden');
      if (open) body.removeAttribute('hidden');
      else body.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '접기' : '펼치기';
    });
  });
}

export default {
  renderEvidenceBadge,
  renderEvidenceSummaryBlock,
  renderEvidenceChecklist,
  renderEvidenceScoreBars,
  renderEvidenceDetail,
  renderWhyRecommendedButton,
  bindEvidenceAccordion,
};
