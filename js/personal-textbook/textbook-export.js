/**
 * Sprint-18A — Personal Textbook export (PDF / Markdown / HTML)
 * PDF = print-ready HTML download (GitHub Pages compatible, no server).
 */

import { loadTextbookDoc, loadSummaryDoc, loadBookmarkDoc, loadFavoriteDoc } from './textbook-storage.js';
import { buildWeakCollection } from './textbook-builder.js';
import { getPatternTree } from './textbook-search.js';

function downloadBlob(filename, content, mime) {
  try {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (err) {
    console.error('[textbook-export] download failed', err);
    return false;
  }
}

function stamp() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildTextbookMarkdown(doc = null) {
  const book = doc || loadTextbookDoc();
  const entries = Array.isArray(book.entries) ? book.entries : [];
  const summaries = loadSummaryDoc();
  const weak = buildWeakCollection(entries);
  const tree = getPatternTree(entries);
  const lines = [
    '# 나만의 AI 해설집',
    '',
    `생성일: ${new Date().toISOString()}`,
    `총 페이지: ${entries.length}`,
    '',
    '## 목차',
    '',
  ];

  for (const ch of tree) {
    lines.push(`### ${ch.chapter}`);
    for (const p of ch.patterns) {
      lines.push(`- ${p.patternName} (\`${p.patternId}\`) — ${p.count}문제`);
    }
    lines.push('');
  }

  lines.push('## Pattern별 정리', '');
  for (const e of entries) {
    lines.push(`### ${e.questionId || '문항'} · ${e.patternName || e.patternId || ''}`);
    lines.push(`- 정오: ${e.correct ? '정답' : '오답'}`);
    lines.push(`- 날짜: ${e.date || ''} ${e.time || ''}`);
    if (e.geminiExplanation) {
      lines.push('', '#### AI 해설', '', e.geminiExplanation, '');
    }
    if (e.formula?.length) {
      lines.push('#### Formula', ...e.formula.map((f) => `- ${f}`), '');
    }
    if (e.calculation?.length) {
      lines.push('#### Calculation', ...e.calculation.map((c, i) => `${i + 1}. ${c}`), '');
    }
    if (e.whyOthersWrong?.length) {
      lines.push('#### 오답 이유', ...e.whyOthersWrong.map((w) => `- ${w}`), '');
    }
    if (e.examTip?.length) {
      lines.push('#### Exam Tip', ...e.examTip.map((t) => `- ${t}`), '');
    }
    lines.push('');
  }

  lines.push('## AI Summary', '');
  for (const [pid, s] of Object.entries(summaries.byPatternId || {})) {
    lines.push(`### Pattern ${s.patternName || pid} (v${s.version || 1})`, '', s.body || '', '');
  }
  for (const [ch, s] of Object.entries(summaries.byChapter || {})) {
    lines.push(`### 단원 ${ch} (v${s.version || 1})`, '', s.body || '', '');
  }

  lines.push('## 오답 · Weak Collection', '');
  lines.push(`### ${weak.titleWeakFormula}`);
  for (const f of weak.weakFormulas || []) {
    lines.push(`- ${f.formula} (오답 ${f.wrong})`);
  }
  lines.push('', `### ${weak.titleWeakPattern}`);
  for (const p of weak.weakPatterns || []) {
    lines.push(`- ${p.patternName} (\`${p.patternId}\`) 오답 ${p.wrong}`);
  }

  const bookmarks = loadBookmarkDoc().questionIds || [];
  const favorites = loadFavoriteDoc().formulas || [];
  lines.push('', '## 즐겨찾기', '', `문항: ${bookmarks.join(', ') || '없음'}`, '');
  lines.push('## Favorite Formula', '');
  for (const f of favorites) {
    lines.push(`- ${typeof f === 'string' ? f : f.formula}`);
  }

  return lines.join('\n');
}

export function buildTextbookHtml(doc = null) {
  const mdLike = buildTextbookMarkdown(doc);
  const book = doc || loadTextbookDoc();
  const entries = Array.isArray(book.entries) ? book.entries : [];
  const tree = getPatternTree(entries);
  const toc = tree
    .map(
      (ch) => `
      <section class="tb-toc-chapter">
        <h3>${esc(ch.chapter)}</h3>
        <ul>${ch.patterns
          .map((p) => `<li>${esc(p.patternName)} <code>${esc(p.patternId)}</code> (${p.count})</li>`)
          .join('')}</ul>
      </section>`,
    )
    .join('');

  const pages = entries
    .map(
      (e) => `
    <article class="tb-page" id="q-${esc(e.questionId)}">
      <h2>${esc(e.questionId)} · ${esc(e.patternName || e.patternId)}</h2>
      <p class="tb-meta">${e.correct ? '정답' : '오답'} · ${esc(e.date)} ${esc(e.time)}</p>
      <h3>AI 해설</h3>
      <p>${esc(e.geminiExplanation)}</p>
      <h3>Formula</h3>
      <ul>${(e.formula || []).map((f) => `<li>${esc(f)}</li>`).join('') || '<li>—</li>'}</ul>
      <h3>Calculation</h3>
      <ol>${(e.calculation || []).map((c) => `<li>${esc(c)}</li>`).join('') || '<li>—</li>'}</ol>
      <h3>오답 이유</h3>
      <ul>${(e.whyOthersWrong || []).map((w) => `<li>${esc(w)}</li>`).join('') || '<li>—</li>'}</ul>
    </article>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>나만의 AI 해설집</title>
  <style>
    body { font-family: "Noto Sans KR", sans-serif; line-height: 1.55; max-width: 820px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { border-bottom: 2px solid #222; padding-bottom: .4rem; }
    .tb-page { page-break-inside: avoid; margin: 2rem 0; padding-top: 1rem; border-top: 1px solid #ddd; }
    code { font-size: .9em; }
    @media print { a { color: inherit; text-decoration: none; } }
  </style>
</head>
<body>
  <h1>나만의 AI 해설집</h1>
  <p>총 ${entries.length}페이지 · ${esc(new Date().toISOString())}</p>
  <h2>자동 목차</h2>
  ${toc}
  ${pages}
  <!-- markdown-source-length:${mdLike.length} -->
</body>
</html>`;
}

/** Print-ready HTML exported as PDF companion (browser Print → Save as PDF). */
export function buildTextbookPdf(doc = null) {
  const html = buildTextbookHtml(doc);
  return html.replace(
    '<title>나만의 AI 해설집</title>',
    '<title>나만의 AI 해설집 (PDF)</title>',
  ).replace(
    '</style>',
    `
    @page { size: A4; margin: 16mm; }
    body { font-size: 11pt; }
    </style>`,
  );
}

export function exportTextbookMarkdown(doc = null) {
  const content = buildTextbookMarkdown(doc);
  return downloadBlob(`personal-ai-textbook-${stamp()}.md`, content, 'text/markdown;charset=utf-8');
}

export function exportTextbookHtml(doc = null) {
  const content = buildTextbookHtml(doc);
  return downloadBlob(`personal-ai-textbook-${stamp()}.html`, content, 'text/html;charset=utf-8');
}

export function exportTextbookPdf(doc = null) {
  const content = buildTextbookPdf(doc);
  const ok = downloadBlob(
    `personal-ai-textbook-${stamp()}.pdf.html`,
    content,
    'text/html;charset=utf-8',
  );
  try {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(content);
      w.document.close();
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch (_e) {
          /* ignore */
        }
      }, 400);
    }
  } catch (_e) {
    /* download still succeeded */
  }
  return ok;
}

export default {
  buildTextbookMarkdown,
  buildTextbookHtml,
  buildTextbookPdf,
  exportTextbookMarkdown,
  exportTextbookHtml,
  exportTextbookPdf,
};
