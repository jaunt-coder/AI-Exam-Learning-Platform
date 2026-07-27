/**
 * Sprint-12A — Choice Editor (override only).
 */

/**
 * @param {string[]} choices
 * @returns {string[]}
 */
export function normalizeChoices(choices) {
  if (!Array.isArray(choices)) return ['', '', '', '', ''];
  return choices.map((c) => String(c ?? ''));
}

/**
 * @param {{
 *   initialChoices?: string[],
 *   onChange?: (choices: string[]) => void,
 * }} [options]
 */
export function createChoiceEditor(options = {}) {
  let choices = normalizeChoices(options.initialChoices);

  function emit() {
    if (typeof options.onChange === 'function') {
      options.onChange(choices.slice());
    }
    return choices.slice();
  }

  return {
    getChoices: () => choices.slice(),

    setChoice(index, value) {
      if (index < 0 || index >= choices.length) return emit();
      choices[index] = String(value ?? '');
      return emit();
    },

    addChoice(value = '') {
      choices.push(String(value ?? ''));
      return emit();
    },

    deleteChoice(index) {
      if (choices.length <= 1) return emit();
      choices.splice(index, 1);
      return emit();
    },

    moveChoice(from, to) {
      if (
        from < 0 ||
        to < 0 ||
        from >= choices.length ||
        to >= choices.length ||
        from === to
      ) {
        return emit();
      }
      const [item] = choices.splice(from, 1);
      choices.splice(to, 0, item);
      return emit();
    },

    /**
     * @param {HTMLElement} container
     */
    mount(container) {
      if (!container) return;
      const render = () => {
        const rows = choices
          .map(
            (text, i) => `
          <li class="rv-choice-row">
            <span class="rv-choice-num">${i + 1}</span>
            <input type="text" data-i="${i}" value="${escapeAttr(text)}" aria-label="보기 ${i + 1}">
            <button type="button" data-act="up" data-i="${i}" class="button button--ghost" aria-label="위로">↑</button>
            <button type="button" data-act="down" data-i="${i}" class="button button--ghost" aria-label="아래로">↓</button>
            <button type="button" data-act="del" data-i="${i}" class="button button--ghost" aria-label="삭제">삭제</button>
          </li>`,
          )
          .join('');
        container.innerHTML = `
          <ul class="rv-choice-list">${rows}</ul>
          <button type="button" data-act="add" class="button button--ghost">선택지 추가</button>
          <ol class="rv-choice-preview" aria-label="Choice Preview">
            ${choices.map((c, i) => `<li>${i + 1}. ${escapeHtml(c)}</li>`).join('')}
          </ol>
        `;
        container.querySelectorAll('input[data-i]').forEach((input) => {
          input.addEventListener('change', () => {
            this.setChoice(Number(input.dataset.i), input.value);
            render();
          });
        });
        container.querySelectorAll('[data-act]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const act = btn.getAttribute('data-act');
            const i = Number(btn.dataset.i);
            if (act === 'add') this.addChoice('');
            else if (act === 'del') this.deleteChoice(i);
            else if (act === 'up') this.moveChoice(i, i - 1);
            else if (act === 'down') this.moveChoice(i, i + 1);
            render();
          });
        });
      };
      render();
    },
  };
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default {
  normalizeChoices,
  createChoiceEditor,
};
