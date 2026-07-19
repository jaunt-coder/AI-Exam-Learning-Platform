/**
 * Shared question rendering — stem/table/choices UI (Question + Exam pages).
 * Backend fields: question (stem), table (markdown), choices (5 items).
 */

const CHOICE_SYMBOL_PATTERN = /[①②③④⑤]/;
const YEAR_PAIR_IN_CHOICE = /20[×xX]\d{1,2}년\s+W/;
const YEAR_PAIR_TOKEN = /20[×xX]\d{1,2}년\s+W[\d,]+(?:\.\d+)?/g;

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function isChoiceGridMarkdown(markdown) {
  return CHOICE_SYMBOL_PATTERN.test(String(markdown || ''));
}

export function choicesIncludeYearPairs(choices) {
  return (choices || []).some((choice) => YEAR_PAIR_IN_CHOICE.test(String(choice)));
}

export function shouldShowQuestionTable(question) {
  const markdown = question?.table ? String(question.table).trim() : '';
  if (!question?.hasTable || !markdown) return false;
  if (choicesIncludeYearPairs(question.choices)) {
    return false;
  }
  return true;
}

export function extractYearAmountPairs(text) {
  YEAR_PAIR_TOKEN.lastIndex = 0;
  const pairs = String(text || '').match(YEAR_PAIR_TOKEN);
  return pairs && pairs.length >= 2 ? pairs : null;
}

export function isPairedYearChoice(text) {
  return Boolean(extractYearAmountPairs(text));
}

export function formatChoiceHtml(text) {
  const raw = String(text || '').trim();
  const pairs = extractYearAmountPairs(raw);
  if (pairs) {
    return pairs
      .map((part) => `<span class="choice-pair">${escapeHtml(part.trim())}</span>`)
      .join('');
  }
  return escapeHtml(raw);
}

function parseMarkdownTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function renderMarkdownTable(markdown, options = {}) {
  const lines = String(markdown)
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const dataRows = lines.filter((line) => !/^\|\s*[-:| ]+\|\s*$/.test(line));
  if (dataRows.length === 0) return '';

  const rows = dataRows.map(parseMarkdownTableRow).filter((cells) => cells.length > 0);
  if (rows.length === 0) return '';

  const [headerCells, ...bodyRows] = rows;
  const thead = headerCells.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('');
  const tbody = bodyRows
    .map(
      (cells) =>
        `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  const tableClass = options.choiceGrid
    ? 'question-table question-table--choice-grid'
    : 'question-table';
  return `<table class="${tableClass}"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

/**
 * Render question markdown table into a container element.
 * @returns {boolean} true when table is visible
 */
export function mountQuestionTable(question, containerEl) {
  if (!containerEl) return false;

  const tableMarkdown = question?.table ? String(question.table).trim() : '';
  if (shouldShowQuestionTable(question)) {
    containerEl.innerHTML = renderMarkdownTable(tableMarkdown, {
      choiceGrid: isChoiceGridMarkdown(tableMarkdown),
    });
    containerEl.hidden = false;
    return true;
  }

  containerEl.innerHTML = '';
  containerEl.hidden = true;
  return false;
}

/**
 * Build choice label class names for a choice string.
 */
export function getChoiceLabelClassName(text) {
  return isPairedYearChoice(text) ? 'choice-label choice-label--paired' : 'choice-label';
}

/**
 * Populate a list element with standardized choice items.
 * @param {object} question
 * @param {HTMLElement} listEl
 * @param {object} [options]
 * @param {string} [options.inputName='answer']
 * @param {string} [options.idPrefix='choice']
 * @param {number|null} [options.selectedValue=null]
 * @param {boolean} [options.required=false]
 * @param {(index: number) => string} [options.getChoiceLabel]
 * @param {(payload: { value: number, label: HTMLLabelElement, input: HTMLInputElement }) => void} [options.onSelect]
 */
export function renderChoiceItems(question, listEl, options = {}) {
  if (!listEl || !question?.choices) return;

  const {
    inputName = 'answer',
    idPrefix = 'choice',
    selectedValue = null,
    required = false,
    getChoiceLabel = (index) => String(index),
    onSelect = null,
  } = options;

  listEl.innerHTML = '';

  question.choices.forEach((text, index) => {
    const value = index + 1;
    const li = document.createElement('li');
    li.className = 'choice-item';

    const label = document.createElement('label');
    label.className = getChoiceLabelClassName(text);
    const inputId = `${idPrefix}-${value}`;
    label.htmlFor = inputId;

    if (selectedValue === value) {
      label.classList.add('is-selected');
    }

    label.innerHTML = `
      <input type="radio" class="choice-input" name="${escapeHtml(inputName)}" id="${inputId}" value="${value}" ${selectedValue === value ? 'checked' : ''} ${required ? 'required' : ''}>
      <span class="choice-symbol">${escapeHtml(getChoiceLabel(value))}</span>
      <span class="choice-text">${formatChoiceHtml(text)}</span>
    `;

    const input = label.querySelector('input');
    if (onSelect && input) {
      input.addEventListener('change', () => {
        onSelect({ value, label, input });
      });
    }

    li.appendChild(label);
    listEl.appendChild(li);
  });
}

/**
 * Render stem text into an element (preserves line breaks via CSS pre-wrap).
 */
export function mountQuestionStem(question, stemEl) {
  if (!stemEl) return;
  stemEl.textContent = question?.question || '';
}
