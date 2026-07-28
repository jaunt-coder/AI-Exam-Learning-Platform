/**
 * Sprint-18A — Quick Review Mode (mobile vertical cards)
 */

export function buildQuickReviewCards(input = {}) {
  const cards = [];
  for (const f of input.formulas || []) {
    cards.push({
      kind: 'formula',
      title: '공식',
      body: f.formula || String(f),
    });
  }
  for (const m of input.mistakes || []) {
    cards.push({
      kind: 'mistake',
      title: '실수',
      body: m.mistake || String(m),
    });
  }
  for (const p of input.patterns || []) {
    cards.push({
      kind: 'pattern',
      title: 'Pattern',
      body: `${p.patternName || p.patternId}`,
    });
  }
  return {
    mode: 'quick-review',
    orientation: 'portrait',
    cards,
    total: cards.length,
  };
}

/**
 * Render simple swipeable card deck HTML.
 */
export function renderQuickReviewHtml(deck, index = 0) {
  const cards = deck?.cards || [];
  const i = Math.max(0, Math.min(index, cards.length - 1));
  const card = cards[i];
  if (!card) {
    return '<p class="fb-quick-empty">Quick Review 카드가 없습니다.</p>';
  }
  return `
    <div class="fb-quick" data-quick-review data-index="${i}" data-total="${cards.length}">
      <p class="fb-quick__meta">${i + 1} / ${cards.length}</p>
      <article class="fb-quick__card is-${card.kind}">
        <p class="fb-quick__title">${escapeHtml(card.title)}</p>
        <p class="fb-quick__body">${escapeHtml(card.body)}</p>
      </article>
      <div class="fb-quick__nav">
        <button type="button" class="button button--ghost" data-quick-prev ${i <= 0 ? 'disabled' : ''}>이전</button>
        <button type="button" class="button button--primary" data-quick-next ${i >= cards.length - 1 ? 'disabled' : ''}>넘기기</button>
      </div>
    </div>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function mountQuickReview(host, deck) {
  if (!host) return null;
  let index = 0;
  const paint = () => {
    host.innerHTML = renderQuickReviewHtml(deck, index);
    host.querySelector('[data-quick-prev]')?.addEventListener('click', () => {
      index = Math.max(0, index - 1);
      paint();
    });
    host.querySelector('[data-quick-next]')?.addEventListener('click', () => {
      index = Math.min((deck.cards || []).length - 1, index + 1);
      paint();
    });
  };
  paint();
  return host;
}

export default {
  buildQuickReviewCards,
  renderQuickReviewHtml,
  mountQuickReview,
};
