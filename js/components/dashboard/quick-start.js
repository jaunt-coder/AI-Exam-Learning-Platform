/**
 * Sprint-14B — Quick Start actions
 */

export function renderQuickStart(el) {
  if (!el) return;
  el.innerHTML = `
    <div class="ld-quick-grid" role="group" aria-label="Quick Start">
      <a class="button ld-btn" href="learning-loop.html">Continue</a>
      <a class="button button--ghost ld-btn" href="#widget-todays-review">Today's Review</a>
      <a class="button button--ghost ld-btn" href="#widget-weak-pattern">Weak Pattern</a>
      <a class="button button--ghost ld-btn" href="exam.html">Mock Exam</a>
      <a class="button button--ghost ld-btn" href="wrong-note.html">Wrong Note</a>
    </div>
  `;
}

export default { renderQuickStart };
