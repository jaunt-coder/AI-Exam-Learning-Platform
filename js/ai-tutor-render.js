/**
 * AI Exam Learning Platform v2
 * AI Tutor Renderer — 범용 8단계 UI 렌더 (Phase 5 v2)
 */

/** @typedef {import('./ai-tutor-engine.js').TutorLesson} TutorLesson */

/**
 * @param {TutorLesson} lesson
 * @param {HTMLElement} container
 */
export function renderTutorLesson(lesson, container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'tutor-lesson-header';
  header.innerHTML = `
    <span class="ai-tutor-badge">AI 과외 선생님</span>
    <span class="tutor-lesson-meta">${lesson.patternName} · ${lesson.levelLabel}</span>
  `;
  container.appendChild(header);

  const nav = document.createElement('nav');
  nav.className = 'tutor-section-nav';
  nav.setAttribute('aria-label', '과외 설명 목차');
  lesson.sections.forEach((section, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tutor-nav-btn';
    btn.textContent = section.shortTitle || section.title;
    btn.dataset.target = section.id;
    btn.addEventListener('click', () => {
      container.querySelector(`#tutor-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(btn);
  });
  container.appendChild(nav);

  lesson.sections.forEach((section) => {
    const wrap = document.createElement('section');
    wrap.className = 'tutor-section';
    wrap.id = `tutor-${section.id}`;
    wrap.dataset.section = section.id;

    const title = document.createElement('h4');
    title.className = 'tutor-section__title';
    title.textContent = section.title;

    const body = document.createElement('div');
    body.className = 'tutor-section__body';

    if (section.steps?.length) {
      const ol = document.createElement('ol');
      ol.className = 'tutor-steps';
      section.steps.forEach((step) => {
        const li = document.createElement('li');
        li.textContent = step;
        ol.appendChild(li);
      });
      body.appendChild(ol);
    }

    if (section.items?.length) {
      section.items.forEach((item) => {
        const block = document.createElement('div');
        block.className = 'tutor-item-block';

        if (item.label) {
          const label = document.createElement('strong');
          label.className = 'tutor-item-label';
          label.textContent = item.label;
          block.appendChild(label);
        }

        const text = document.createElement('p');
        text.className = 'tutor-item-text';
        text.textContent = item.content;
        block.appendChild(text);
        body.appendChild(block);
      });
    }

    if (section.links?.length) {
      const ul = document.createElement('ul');
      ul.className = 'tutor-link-list';
      section.links.forEach((link) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'tutor-link';
        a.textContent = link.label;
        li.appendChild(a);
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    if (section.content) {
      const p = document.createElement('p');
      p.className = 'tutor-section__text';
      p.textContent = section.content;
      body.appendChild(p);
    }

    wrap.append(title, body);
    container.appendChild(wrap);
  });
}

/**
 * @deprecated generateAiExplanation 호환
 */
export function renderAiExplanation(lesson, container) {
  renderTutorLesson(lesson, container);
}
