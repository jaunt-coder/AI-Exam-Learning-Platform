/**
 * Sprint-12A — Spreadsheet-style Table Editor (markdown ↔ grid).
 */

/**
 * Parse GitHub-flavored markdown table into grid.
 * @param {string|object|null} table
 * @returns {{ headers: string[], rows: string[][], raw: string }}
 */
export function parseMarkdownTable(table) {
  if (table && typeof table === 'object' && !Array.isArray(table)) {
    const headers = Array.isArray(table.headers)
      ? table.headers.map(String)
      : [];
    const rows = Array.isArray(table.rows)
      ? table.rows.map((r) => (Array.isArray(r) ? r.map(String) : []))
      : [];
    return { headers, rows, raw: serializeMarkdownTable(headers, rows) };
  }

  const raw = String(table || '').trim();
  if (!raw) {
    return { headers: [''], rows: [['']], raw: '' };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const allRows = [];
  for (const line of lines) {
    if (isSeparatorLine(line)) continue;
    allRows.push(splitRow(line));
  }
  if (!allRows.length) {
    return { headers: [''], rows: [['']], raw };
  }
  const headers = allRows[0];
  const rows = allRows.slice(1);
  return { headers, rows: rows.length ? rows : [['']], raw };
}

function isSeparatorLine(line) {
  const cells = splitRow(line);
  if (!cells.length) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(String(c).trim()) || c.trim() === '');
}

function splitRow(line) {
  let s = String(line || '').trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 */
export function serializeMarkdownTable(headers, rows) {
  const cols = Math.max(
    headers.length,
    ...rows.map((r) => (Array.isArray(r) ? r.length : 0)),
    1,
  );
  const norm = (arr) => {
    const a = Array.isArray(arr) ? arr.map((x) => String(x ?? '')) : [];
    while (a.length < cols) a.push('');
    return a.slice(0, cols);
  };
  const h = norm(headers);
  const body = (rows.length ? rows : [['']]).map(norm);
  const sep = h.map(() => '---');
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(h), line(sep), ...body.map(line)].join('\n');
}

/**
 * Create table editor controller with undo/redo.
 * @param {{
 *   initialTable?: string|object,
 *   onChange?: (markdown: string, model: object) => void,
 * }} [options]
 */
export function createTableEditor(options = {}) {
  const parsed = parseMarkdownTable(options.initialTable || '');
  let model = {
    headers: parsed.headers.slice(),
    rows: parsed.rows.map((r) => r.slice()),
  };
  const undoStack = [];
  const redoStack = [];

  function snapshot() {
    return {
      headers: model.headers.slice(),
      rows: model.rows.map((r) => r.slice()),
    };
  }

  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }

  function emit() {
    const markdown = serializeMarkdownTable(model.headers, model.rows);
    if (typeof options.onChange === 'function') {
      options.onChange(markdown, snapshot());
    }
    return markdown;
  }

  function ensureSize(r, c) {
    while (model.rows.length <= r) {
      model.rows.push(model.headers.map(() => ''));
    }
    const cols = Math.max(model.headers.length, c + 1);
    while (model.headers.length < cols) model.headers.push('');
    model.rows = model.rows.map((row) => {
      const next = row.slice();
      while (next.length < cols) next.push('');
      return next;
    });
  }

  return {
    getModel: () => snapshot(),
    getMarkdown: () => serializeMarkdownTable(model.headers, model.rows),

    setCell(rowIndex, colIndex, value) {
      pushUndo();
      if (rowIndex < 0) {
        ensureSize(0, colIndex);
        model.headers[colIndex] = String(value ?? '');
      } else {
        ensureSize(rowIndex, colIndex);
        model.rows[rowIndex][colIndex] = String(value ?? '');
      }
      return emit();
    },

    setHeader(colIndex, value) {
      return this.setCell(-1, colIndex, value);
    },

    addRow(atIndex) {
      pushUndo();
      const row = model.headers.map(() => '');
      const idx =
        typeof atIndex === 'number' ? atIndex : model.rows.length;
      model.rows.splice(idx, 0, row);
      return emit();
    },

    deleteRow(index) {
      if (model.rows.length <= 1) return emit();
      pushUndo();
      model.rows.splice(index, 1);
      return emit();
    },

    addColumn(atIndex) {
      pushUndo();
      const idx =
        typeof atIndex === 'number' ? atIndex : model.headers.length;
      model.headers.splice(idx, 0, '');
      model.rows = model.rows.map((r) => {
        const next = r.slice();
        next.splice(idx, 0, '');
        return next;
      });
      return emit();
    },

    deleteColumn(index) {
      if (model.headers.length <= 1) return emit();
      pushUndo();
      model.headers.splice(index, 1);
      model.rows = model.rows.map((r) => {
        const next = r.slice();
        next.splice(index, 1);
        return next;
      });
      return emit();
    },

    undo() {
      if (!undoStack.length) return null;
      redoStack.push(snapshot());
      model = undoStack.pop();
      return emit();
    },

    redo() {
      if (!redoStack.length) return null;
      undoStack.push(snapshot());
      model = redoStack.pop();
      return emit();
    },

    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,

    /**
     * Mount spreadsheet UI into container.
     * @param {HTMLElement} container
     */
    mount(container) {
      if (!container) return;
      const render = () => {
        const { headers, rows } = model;
        const thead = headers
          .map(
            (h, c) =>
              `<th><input data-kind="header" data-c="${c}" value="${escapeAttr(h)}" aria-label="헤더 ${c + 1}"></th>`,
          )
          .join('');
        const body = rows
          .map(
            (row, r) =>
              `<tr>${row
                .map(
                  (cell, c) =>
                    `<td><input data-kind="cell" data-r="${r}" data-c="${c}" value="${escapeAttr(cell)}" aria-label="행 ${r + 1} 열 ${c + 1}"></td>`,
                )
                .join('')}</tr>`,
          )
          .join('');

        container.innerHTML = `
          <div class="rv-table-toolbar" role="toolbar" aria-label="표 편집">
            <button type="button" data-act="add-row" class="button button--ghost">행 추가</button>
            <button type="button" data-act="del-row" class="button button--ghost">행 삭제</button>
            <button type="button" data-act="add-col" class="button button--ghost">열 추가</button>
            <button type="button" data-act="del-col" class="button button--ghost">열 삭제</button>
            <button type="button" data-act="undo" class="button button--ghost">Undo</button>
            <button type="button" data-act="redo" class="button button--ghost">Redo</button>
          </div>
          <div class="rv-table-scroll">
            <table class="rv-spreadsheet" role="grid">
              <thead><tr>${thead}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          </div>
          <pre class="rv-table-preview" aria-label="Table Preview">${escapeHtml(serializeMarkdownTable(headers, rows))}</pre>
        `;

        container.querySelectorAll('input').forEach((input) => {
          input.addEventListener('change', () => {
            const kind = input.dataset.kind;
            const c = Number(input.dataset.c);
            const r = Number(input.dataset.r);
            if (kind === 'header') this.setHeader(c, input.value);
            else this.setCell(r, c, input.value);
            render();
            focusCell(container, kind, r, c);
          });
          input.addEventListener('keydown', (ev) => {
            const kind = input.dataset.kind;
            const c = Number(input.dataset.c);
            const r = Number(input.dataset.r);
            if (ev.key === 'Tab') {
              ev.preventDefault();
              const nextC = ev.shiftKey ? c - 1 : c + 1;
              if (nextC >= 0 && nextC < headers.length) {
                focusCell(container, kind, r, nextC);
              } else if (!ev.shiftKey && kind === 'cell') {
                focusCell(container, 'cell', r + 1, 0);
              }
            } else if (ev.key === 'Enter') {
              ev.preventDefault();
              input.dispatchEvent(new Event('change'));
              if (kind === 'cell') focusCell(container, 'cell', r + 1, c);
            }
          });
        });

        container.querySelectorAll('[data-act]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const act = btn.getAttribute('data-act');
            if (act === 'add-row') this.addRow();
            else if (act === 'del-row') this.deleteRow(model.rows.length - 1);
            else if (act === 'add-col') this.addColumn();
            else if (act === 'del-col') this.deleteColumn(model.headers.length - 1);
            else if (act === 'undo') this.undo();
            else if (act === 'redo') this.redo();
            render();
          });
        });
      };

      render();
    },
  };
}

function focusCell(container, kind, r, c) {
  const sel =
    kind === 'header'
      ? `input[data-kind="header"][data-c="${c}"]`
      : `input[data-kind="cell"][data-r="${r}"][data-c="${c}"]`;
  const el = container.querySelector(sel);
  if (el) el.focus();
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
  parseMarkdownTable,
  serializeMarkdownTable,
  createTableEditor,
};
