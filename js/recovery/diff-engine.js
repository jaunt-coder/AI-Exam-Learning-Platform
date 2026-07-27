/**
 * Sprint-12B — Diff Engine
 * Green=add, Yellow=change, Red=delete
 */

/**
 * @param {string} before
 * @param {string} after
 */
export function diffTextLines(before, after) {
  const a = String(before ?? '').split(/\r?\n/);
  const b = String(after ?? '').split(/\r?\n/);
  const max = Math.max(a.length, b.length);
  const parts = [];
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined && right !== undefined) {
      parts.push({ type: 'add', after: right });
    } else if (left !== undefined && right === undefined) {
      parts.push({ type: 'delete', before: left });
    } else if (left === right) {
      parts.push({ type: 'equal', before: left, after: right });
    } else {
      parts.push({ type: 'change', before: left, after: right });
    }
  }
  return parts;
}

/**
 * @param {unknown[]} before
 * @param {unknown[]} after
 */
export function diffArrays(before, after) {
  const a = Array.isArray(before) ? before.map(String) : [];
  const b = Array.isArray(after) ? after.map(String) : [];
  const max = Math.max(a.length, b.length);
  const rows = [];
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined && right !== undefined) {
      rows.push({ index: i, type: 'add', before: null, after: right });
    } else if (left !== undefined && right === undefined) {
      rows.push({ index: i, type: 'delete', before: left, after: null });
    } else if (left === right) {
      rows.push({ index: i, type: 'equal', before: left, after: right });
    } else {
      rows.push({ index: i, type: 'change', before: left, after: right });
    }
  }
  return rows;
}

/**
 * @param {object|null} before
 * @param {object|null} after
 */
export function diffTables(before, after) {
  const bh = Array.isArray(before?.headers) ? before.headers.map(String) : [];
  const ah = Array.isArray(after?.headers) ? after.headers.map(String) : [];
  const br = Array.isArray(before?.rows) ? before.rows : [];
  const ar = Array.isArray(after?.rows) ? after.rows : [];
  const headers = diffArrays(bh, ah);
  const rowCount = Math.max(br.length, ar.length);
  const rows = [];
  for (let r = 0; r < rowCount; r += 1) {
    const left = br[r];
    const right = ar[r];
    if (!left && right) {
      rows.push({ row: r, type: 'add', before: null, after: right });
    } else if (left && !right) {
      rows.push({ row: r, type: 'delete', before: left, after: null });
    } else {
      const cells = diffArrays(
        Array.isArray(left) ? left : [],
        Array.isArray(right) ? right : [],
      );
      rows.push({
        row: r,
        type: cells.some((c) => c.type !== 'equal') ? 'change' : 'equal',
        before: left,
        after: right,
        cells,
      });
    }
  }
  return { headers, rows };
}

/**
 * @param {object} change
 * @param {object} currentQuestion
 */
export function buildChangeDiff(change, currentQuestion = {}) {
  const field = String(change?.field || '').toLowerCase();
  if (field === 'table') {
    const after =
      change.after && change.after.headers
        ? change.after
        : { headers: [], rows: [] };
    let before = null;
    if (change.before && typeof change.before === 'object' && change.before.headers) {
      before = change.before;
    }
    return {
      field,
      kind: 'table',
      table: diffTables(before, after),
    };
  }
  if (field === 'choices') {
    return {
      field,
      kind: 'choices',
      choices: diffArrays(
        change.before ?? currentQuestion.choices,
        change.after,
      ),
    };
  }
  if (field === 'question') {
    return {
      field,
      kind: 'text',
      lines: diffTextLines(
        change.before ?? currentQuestion.question ?? '',
        change.after ?? '',
      ),
    };
  }
  return {
    field,
    kind: 'value',
    before: change.before,
    after: change.after,
    type:
      change.before == null
        ? 'add'
        : change.after == null
          ? 'delete'
          : 'change',
  };
}

/**
 * @param {string} type
 */
export function diffToneClass(type) {
  if (type === 'add') return 'ocr-diff--add';
  if (type === 'delete') return 'ocr-diff--delete';
  if (type === 'change') return 'ocr-diff--change';
  return 'ocr-diff--equal';
}

export default {
  diffTextLines,
  diffArrays,
  diffTables,
  buildChangeDiff,
  diffToneClass,
};
