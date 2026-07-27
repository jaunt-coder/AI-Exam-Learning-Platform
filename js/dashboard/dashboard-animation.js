/**
 * Sprint-14B — Dashboard animation helpers
 */

export function fadeIn(el, duration = 420) {
  if (!el) return;
  el.classList.add('ld-anim-fade');
  el.style.animationDuration = `${duration}ms`;
}

export function animateProgress(barEl, targetPct, duration = 700) {
  if (!barEl) return;
  const fill = barEl.querySelector('.ld-progress-fill') || barEl.querySelector('span');
  if (!fill) return;
  const target = Math.max(0, Math.min(100, Number(targetPct) || 0));
  fill.style.width = '0%';
  requestAnimationFrame(() => {
    fill.style.transition = `width ${duration}ms ease-out`;
    fill.style.width = `${target}%`;
  });
  barEl.setAttribute('aria-valuenow', String(target));
}

export function skeleton(html = '') {
  return `<div class="ld-skeleton" aria-busy="true" aria-live="polite">${html || '불러오는 중…'}</div>`;
}

export function observeLazy(nodes, onVisible) {
  if (typeof IntersectionObserver === 'undefined') {
    nodes.forEach((n) => onVisible(n));
    return null;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible(entry.target);
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '80px', threshold: 0.1 },
  );
  nodes.forEach((n) => io.observe(n));
  return io;
}

export default {
  fadeIn,
  animateProgress,
  skeleton,
  observeLazy,
};
