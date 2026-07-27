/**
 * Sprint-14C — Recommendation page Evidence UI wrapper
 * Does not change Recommendation Algorithm / ranking.
 * Calls Phase 7 init, then attaches Evidence panels.
 */

import { initRecommendationPage } from './recommendation-engine.js';
import { loadPhase1Database } from './data-loader.js';
import { explainActiveRecommendations } from './evidence/evidence-engine.js';
import {
  renderEvidenceBadge,
  renderEvidenceDetail,
  bindEvidenceAccordion,
} from './evidence/evidence-renderer.js';

function mountEvidenceOntoCards(packs = []) {
  const cards = document.querySelectorAll('.recommend-card');
  if (!cards.length || !packs.length) return;

  cards.forEach((card, idx) => {
    const pack = packs[idx] || packs[0];
    if (!pack?.evidence) return;
    if (card.querySelector('.ev-rec-evidence')) return;
    const host = document.createElement('div');
    host.className = 'ev-rec-evidence';
    host.innerHTML = `
      ${renderEvidenceBadge(pack.evidence)}
      ${renderEvidenceDetail(pack.evidence, pack.evidenceSummary || pack.summary || '', { expanded: false })}
    `;
    card.appendChild(host);
  });
  bindEvidenceAccordion(document);
}

export async function initRecommendationPageWithEvidence() {
  const result = await initRecommendationPage();
  try {
    const db = await loadPhase1Database();
    const packs = explainActiveRecommendations(db.valid ? db.questions || [] : []);
    requestAnimationFrame(() => mountEvidenceOntoCards(packs));
  } catch (_err) {
    /* Evidence UI non-critical */
  }
  return result;
}

export default { initRecommendationPageWithEvidence };
