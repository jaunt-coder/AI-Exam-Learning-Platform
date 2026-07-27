/**
 * Shared question rendering — stem/table/choices/solution UI (Question + Exam + Loop).
 * Student screens render Resolved Question fields as HTML (never raw markdown table text).
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

/**
 * True when Resolved Question carries table content (markdown / grid / html).
 */
export function hasTableContent(table) {
  if (table == null || table === false) return false;
  if (typeof table === 'object' && !Array.isArray(table)) {
    const headers = Array.isArray(table.headers) ? table.headers : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    return (
      headers.some((h) => String(h || '').trim())
      || rows.some((r) =>
        (Array.isArray(r) ? r : []).some((c) => String(c || '').trim()),
      )
    );
  }
  const s = String(table).trim();
  if (!s || s === '[object Object]') return false;
  return true;
}

export function shouldShowQuestionTable(question) {
  if (!hasTableContent(question?.table)) return false;
  if (choicesIncludeYearPairs(question?.choices)) return false;
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

function renderGridAsHtml(headers, rows, options = {}) {
  const h = (Array.isArray(headers) ? headers : []).map(String);
  const body = (Array.isArray(rows) ? rows : []).map((r) =>
    (Array.isArray(r) ? r : []).map(String),
  );
  if (!h.length && !body.length) return '';
  const cols = Math.max(h.length, ...body.map((r) => r.length), 1);
  const normH = Array.from({ length: cols }, (_, i) => h[i] || '');
  const thead = normH.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join('');
  const tbody = body
    .map((cells) => {
      const row = Array.from({ length: cols }, (_, i) => cells[i] || '');
      return `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
    })
    .join('');
  const tableClass = options.choiceGrid
    ? 'question-table question-table--choice-grid'
    : 'question-table';
  return `<table class="${tableClass}"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
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
  return renderGridAsHtml(headerCells, bodyRows, options);
}

/**
 * Convert Override/DB table (markdown | {headers,rows} | HTML string) → HTML <table>.
 * Never leaves raw markdown in the student DOM.
 */
export function renderTableToHtml(table, options = {}) {
  if (!hasTableContent(table)) return '';

  if (typeof table === 'object' && !Array.isArray(table)) {
    return renderGridAsHtml(table.headers || [], table.rows || [], options);
  }

  const raw = String(table).trim();
  if (/<table[\s>]/i.test(raw)) {
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const el = doc.querySelector('table');
      if (el) {
        const headers = Array.from(
          el.querySelectorAll('thead th, tr:first-child th'),
        ).map((n) => n.textContent || '');
        const bodyRows = Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
          Array.from(tr.querySelectorAll('td, th')).map((n) => n.textContent || ''),
        );
        const fallbackRows =
          bodyRows.length > 0
            ? bodyRows
            : Array.from(el.querySelectorAll('tr'))
                .slice(headers.length ? 1 : 0)
                .map((tr) =>
                  Array.from(tr.querySelectorAll('td, th')).map(
                    (n) => n.textContent || '',
                  ),
                );
        if (headers.length || fallbackRows.length) {
          return renderGridAsHtml(headers, fallbackRows, options);
        }
      }
    } catch (_err) {
      /* fall through */
    }
  }

  return renderMarkdownTable(raw, {
    ...options,
    choiceGrid: options.choiceGrid ?? isChoiceGridMarkdown(raw),
  });
}

/**
 * Render question table into a container as real HTML <table>.
 * @returns {boolean} true when table is visible
 */
export function mountQuestionTable(question, containerEl) {
  if (!containerEl) return false;

  if (shouldShowQuestionTable(question)) {
    const html = renderTableToHtml(question.table, {
      choiceGrid: isChoiceGridMarkdown(
        typeof question.table === 'string' ? question.table : '',
      ),
    });
    if (html) {
      containerEl.innerHTML = html;
      containerEl.hidden = false;
      return true;
    }
  }

  containerEl.innerHTML = '';
  containerEl.hidden = true;
  return false;
}

/**
 * Render Resolved solution (string or object) into a container.
 * @returns {boolean}
 */
export function mountQuestionSolution(question, containerEl) {
  if (!containerEl) return false;
  const sol = question?.solution;
  let explanation = '';
  let steps = [];

  if (typeof sol === 'string') {
    explanation = sol.trim();
  } else if (sol && typeof sol === 'object') {
    explanation = String(
      sol.explanation || sol.summary || sol.diagnosis || sol.takeaway || '',
    ).trim();
    steps = Array.isArray(sol.steps) ? sol.steps : [];
  }

  if (!explanation && !steps.length) {
    containerEl.innerHTML = '';
    containerEl.hidden = true;
    return false;
  }

  const stepsHtml = steps
    .map((s, i) => {
      if (typeof s === 'string') {
        return `<li><strong>${i + 1}.</strong> ${escapeHtml(s)}</li>`;
      }
      const title = s?.title || `Step ${s?.order || i + 1}`;
      const body = s?.explanation || s?.body || '';
      return `<li><strong>${escapeHtml(String(title))}</strong><p>${escapeHtml(body)}</p></li>`;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="question-solution__inner">
      <h3 class="question-solution__title">해설</h3>
      ${explanation ? `<p class="question-solution__text">${escapeHtml(explanation)}</p>` : ''}
      ${stepsHtml ? `<ol class="question-solution__steps">${stepsHtml}</ol>` : ''}
    </div>
  `;
  containerEl.hidden = false;
  return true;
}

/**
 * Build choice label class names for a choice string.
 */
export function getChoiceLabelClassName(text) {
  return isPairedYearChoice(text) ? 'choice-label choice-label--paired' : 'choice-label';
}

/**
 * Populate a list element with standardized choice items.
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
  stemEl.textContent = question?.question || question?.stem || '';
}
