/**
 * Sprint-09A Problem Report System
 * Append-only QA queue for Question Patch Foundation.
 * No Question DB mutation · No AI analysis.
 */

import { downloadTextFile } from '../runtime/evidence-service.js';

export const PROBLEM_REPORT_KEY = 'learning.problemReports.v1';
export const PROBLEM_REPORT_SCHEMA = 'learning.problemReports.v1';

export const REPORT_CATEGORIES = [
  '표 누락',
  '계산표 누락',
  '자료 누락',
  '줄바꿈 이상',
  '띄어쓰기',
  'OCR 오류',
  '보기 오류',
  '해설 이상',
  'Pattern 연결 이상',
  '중복 문제',
  '기타',
];

function emptyBag() {
  return { schema: PROBLEM_REPORT_SCHEMA, nextSeq: 1, items: [] };
}

export function loadProblemReports() {
  try {
    const raw = localStorage.getItem(PROBLEM_REPORT_KEY);
    if (!raw) return emptyBag();
    const bag = JSON.parse(raw);
    if (!bag || !Array.isArray(bag.items)) return emptyBag();
    return {
      schema: PROBLEM_REPORT_SCHEMA,
      nextSeq: Number(bag.nextSeq) > 0 ? Number(bag.nextSeq) : bag.items.length + 1,
      items: bag.items,
    };
  } catch {
    return emptyBag();
  }
}

function saveBag(bag) {
  localStorage.setItem(
    PROBLEM_REPORT_KEY,
    JSON.stringify({
      schema: PROBLEM_REPORT_SCHEMA,
      nextSeq: bag.nextSeq,
      items: bag.items,
      updated_at: new Date().toISOString(),
    })
  );
}

/**
 * Append-only create. Never updates existing records.
 * @param {object} input
 */
export function appendProblemReport(input) {
  const questionId = String(input.questionId || '').trim();
  if (!questionId) return { ok: false, error: 'missing_questionId' };

  const categories = Array.isArray(input.category)
    ? input.category.filter(Boolean)
    : [];
  if (!categories.length && !String(input.memo || '').trim()) {
    return { ok: false, error: 'empty_report' };
  }

  const bag = loadProblemReports();
  const seq = bag.nextSeq;
  const id = `QA-${String(seq).padStart(5, '0')}`;
  const record = {
    id,
    questionId,
    pdf: input.pdf ?? null,
    page: input.page ?? null,
    questionNo: input.questionNo ?? null,
    year: input.year ?? null,
    category: categories,
    memo: String(input.memo || '').trim(),
    status: 'Open',
    patchTarget: questionId,
    createdAt: new Date().toISOString(),
  };

  bag.items.push(record);
  bag.nextSeq = seq + 1;
  saveBag(bag);
  return { ok: true, record };
}

export function getProblemReportStats() {
  const items = loadProblemReports().items;
  const counts = { total: items.length, Open: 0, Closed: 0, Pending: 0 };
  for (const r of items) {
    const st = r.status || 'Open';
    if (counts[st] === undefined) counts[st] = 0;
    counts[st] += 1;
  }
  return counts;
}

export function buildProblemReportPackage() {
  const bag = loadProblemReports();
  const stats = getProblemReportStats();
  return {
    schema: PROBLEM_REPORT_SCHEMA,
    export_version: '1.0',
    for_analyst: '07_User_Research_Analyst',
    exported_at: new Date().toISOString(),
    summary: stats,
    reports: bag.items,
  };
}

export function problemReportsToMarkdown(pkg) {
  const lines = [
    '# Problem Report Export',
    '',
    `> For: 07_User_Research_Analyst · schema \`${pkg.schema}\``,
    '',
    `- exported_at: ${pkg.exported_at}`,
    `- total: ${pkg.summary?.total ?? 0}`,
    `- Open: ${pkg.summary?.Open ?? 0}`,
    `- Pending: ${pkg.summary?.Pending ?? 0}`,
    `- Closed: ${pkg.summary?.Closed ?? 0}`,
    '',
    '## Reports',
    '',
  ];
  const reports = pkg.reports || [];
  if (!reports.length) lines.push('(none)', '');
  else {
    reports.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.id} · \`${r.questionId}\``);
      lines.push('');
      lines.push(`- status: ${r.status || 'Open'}`);
      lines.push(`- year/page/no: ${r.year ?? '—'} / ${r.page ?? '—'} / ${r.questionNo ?? '—'}`);
      lines.push(`- pdf: ${r.pdf || '—'}`);
      lines.push(`- category: ${(r.category || []).join(', ') || '—'}`);
      lines.push(`- memo: ${r.memo ? r.memo.replace(/\n/g, ' ') : '—'}`);
      lines.push(`- patchTarget: ${r.patchTarget || r.questionId}`);
      lines.push(`- createdAt: ${r.createdAt}`);
      lines.push('');
    });
  }
  return lines.join('\n');
}

export function exportProblemReports(format = 'json') {
  const pkg = buildProblemReportPackage();
  const stamp = `problem-report-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
  if (format === 'md') {
    downloadTextFile(
      `${stamp}.md`,
      problemReportsToMarkdown(pkg),
      'text/markdown;charset=utf-8'
    );
    return { ok: true, filename: `${stamp}.md` };
  }
  downloadTextFile(
    `${stamp}.json`,
    JSON.stringify(pkg, null, 2),
    'application/json;charset=utf-8'
  );
  return { ok: true, filename: `${stamp}.json` };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Open Problem Report modal for a question.
 * @param {string} questionId
 */
export async function openProblemReportModal(questionId) {
  const { getSourceEntry } = await import('./source-viewer.js');
  const entry = (await getSourceEntry(questionId)) || {};
  const year = entry.year ?? '—';
  const page = entry.page ?? '—';
  const qNo = entry.questionNo ?? entry.questionNumber ?? '—';
  const pdfLabel =
    entry.year != null
      ? String(entry.year)
      : entry.pdf || '원본 연결 준비중';

  let root = document.getElementById('problem-report-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'problem-report-root';
    document.body.appendChild(root);
  }

  const checks = REPORT_CATEGORIES.map(
    (c, i) => `
    <label class="pr-check">
      <input type="checkbox" name="pr-cat" value="${escapeHtml(c)}" id="pr-cat-${i}" />
      <span>${escapeHtml(c)}</span>
    </label>`
  ).join('');

  root.innerHTML = `
    <div class="pr-backdrop" data-pr-close></div>
    <div class="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-title">
      <header class="pr-modal__head">
        <h2 id="pr-title" class="pr-modal__title">문제 수정 요청</h2>
        <button type="button" class="pr-icon-btn" data-pr-close aria-label="닫기">×</button>
      </header>
      <div class="pr-modal__body">
        <dl class="pr-facts">
          <div><dt>문제 ID</dt><dd><code>${escapeHtml(questionId)}</code></dd></div>
          <div><dt>원본 시험지</dt><dd>${escapeHtml(String(year))}년 · ${escapeHtml(String(page))}페이지 · ${escapeHtml(String(qNo))}번</dd></div>
          <div><dt>PDF</dt><dd class="pr-facts__muted">${escapeHtml(pdfLabel)}</dd></div>
        </dl>
        <fieldset class="pr-cats">
          <legend>QA</legend>
          <div class="pr-cat-grid">${checks}</div>
        </fieldset>
        <label class="pr-memo-label" for="pr-memo">메모</label>
        <textarea id="pr-memo" class="pr-memo" rows="3" maxlength="500"
          placeholder="무엇이 이상한지 짧게 적어 주세요"></textarea>
        <p class="pr-status" data-pr-status role="status"></p>
      </div>
      <footer class="pr-modal__foot">
        <button type="button" class="button button--ghost button--touch" data-pr-close>취소</button>
        <button type="button" class="button button--primary button--touch" data-pr-save>저장</button>
      </footer>
    </div>
  `;

  const setStatus = (msg, kind = '') => {
    const el = root.querySelector('[data-pr-status]');
    if (!el) return;
    el.textContent = msg || '';
    el.dataset.kind = kind;
  };

  const close = () => {
    root.innerHTML = '';
  };

  root.querySelectorAll('[data-pr-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  root.querySelector('[data-pr-save]')?.addEventListener('click', () => {
    const category = [...root.querySelectorAll('input[name="pr-cat"]:checked')].map(
      (c) => c.value
    );
    const memo = root.querySelector('#pr-memo')?.value || '';
    const result = appendProblemReport({
      questionId,
      pdf: entry.year != null ? String(entry.year) : entry.pdf || null,
      page: entry.page ?? null,
      questionNo: entry.questionNo ?? entry.questionNumber ?? null,
      year: entry.year ?? null,
      category,
      memo,
    });
    if (!result.ok) {
      setStatus(
        result.error === 'empty_report'
          ? '카테고리 또는 메모를 입력하세요.'
          : `저장 실패: ${result.error}`,
        'err'
      );
      return;
    }
    setStatus(`${result.record.id} 저장됨 · Patch Queue에 추가되었습니다.`, 'ok');
    setTimeout(close, 700);
  });

  queueMicrotask(() => {
    root.querySelector('#pr-memo')?.focus();
  });
}

export default {
  PROBLEM_REPORT_KEY,
  REPORT_CATEGORIES,
  loadProblemReports,
  appendProblemReport,
  getProblemReportStats,
  buildProblemReportPackage,
  exportProblemReports,
  openProblemReportModal,
};
