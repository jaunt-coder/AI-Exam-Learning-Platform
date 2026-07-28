/**
 * Sprint-18A — Final Revision Book export (PDF / Markdown / HTML)
 */

import { getActiveFinalBook } from './final-book-engine.js';

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
    console.error('[final-book-export] download failed', err);
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

function itemLines(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it, i) => {
    if (typeof it === 'string') return `${i + 1}. ${it}`;
    if (it.formula) return `${i + 1}. ${it.formula}`;
    if (it.mistake) return `${i + 1}. ${it.mistake}${it.count ? ` (×${it.count})` : ''}`;
    if (it.patternName) return `${i + 1}. ${it.patternName} · Mastery ${it.mastery ?? '—'}`;
    if (it.questionId) return `${i + 1}. ${it.questionId} · ${it.mistake || ''}`;
    if (it.steps) {
      return `${i + 1}. ${it.patternName || it.questionId}\n${(it.steps || []).map((s) => `   - ${s}`).join('\n')}`;
    }
    if (it.front && it.back) return `${i + 1}. [${it.front}] ${it.back}`;
    if (it.body) return `${i + 1}. ${it.body}`;
    return `${i + 1}. ${JSON.stringify(it)}`;
  });
}

export function buildFinalBookMarkdown(book = null) {
  const b = book || getActiveFinalBook();
  if (!b) return '# 시험 직전 AI 정리집\n\n(아직 생성되지 않았습니다)\n';
  const lines = [
    `# ${b.title || '시험 직전 AI 정리집'}`,
    '',
    `생성일: ${b.createdAt || ''}`,
    `페이지: ${b.pageCount || 0}`,
    `트리거: ${b.trigger || 'manual'}${b.triggerDay != null ? ` (D-${b.triggerDay})` : ''}`,
    '',
    '> 출제 예측 없음 — 학생 위험 구간 우선 정리',
    '',
  ];
  for (const sec of b.sections || []) {
    lines.push(`## ${sec.title}`, '');
    lines.push(...itemLines(sec.items), '');
  }
  if (b.examDaySheet) {
    lines.push('## Exam Day Sheet', '');
    for (const p of b.examDaySheet.pages || []) {
      lines.push(`### ${p.page}페이지 · ${p.title}`, ...(p.body || []).map((x) => `- ${x}`), '');
    }
  }
  if (b.memorySheet?.sheetText) {
    lines.push('## Memory Sheet', '', b.memorySheet.sheetText, '');
  }
  return lines.join('\n');
}

export function buildFinalBookHtml(book = null) {
  const b = book || getActiveFinalBook();
  const md = buildFinalBookMarkdown(b);
  if (!b) {
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>시험 직전 AI 정리집</title></head><body><h1>시험 직전 AI 정리집</h1><p>아직 생성되지 않았습니다.</p></body></html>`;
  }
  const sections = (b.sections || [])
    .map(
      (sec) => `
      <section class="fb-sec">
        <h2>${esc(sec.title)}</h2>
        <ol>${itemLines(sec.items)
          .map((line) => `<li>${esc(line.replace(/^\d+\.\s*/, ''))}</li>`)
          .join('')}</ol>
      </section>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${esc(b.title)}</title>
  <style>
    body { font-family: "Noto Sans KR", sans-serif; max-width: 800px; margin: 2rem auto; line-height: 1.55; padding: 0 1rem; }
    h1 { border-bottom: 2px solid #222; }
    .fb-sec { page-break-inside: avoid; margin: 1.5rem 0; }
    @page { size: A4; margin: 14mm; }
  </style>
</head>
<body>
  <h1>${esc(b.title)}</h1>
  <p>생성일 ${esc(b.createdAt)} · ${b.pageCount || 0}페이지 · 출제예측 없음</p>
  ${sections}
  <!-- md:${md.length} -->
</body>
</html>`;
}

export function buildFinalBookPdf(book = null) {
  return buildFinalBookHtml(book).replace(
    '</style>',
    'body{font-size:10.5pt;} h2{font-size:13pt;} </style>',
  );
}

export function exportFinalBookMarkdown(book = null) {
  return downloadBlob(
    `final-revision-book-${stamp()}.md`,
    buildFinalBookMarkdown(book),
    'text/markdown;charset=utf-8',
  );
}

export function exportFinalBookHtml(book = null) {
  return downloadBlob(
    `final-revision-book-${stamp()}.html`,
    buildFinalBookHtml(book),
    'text/html;charset=utf-8',
  );
}

export function exportFinalBookPdf(book = null) {
  const content = buildFinalBookPdf(book);
  const ok = downloadBlob(
    `final-revision-book-${stamp()}.pdf.html`,
    content,
    'text/html;charset=utf-8',
  );
  try {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(content);
      w.document.close();
      setTimeout(() => {
        try {
          w.print();
        } catch (_e) {
          /* ignore */
        }
      }, 400);
    }
  } catch (_e) {
    /* download ok */
  }
  return ok;
}

export default {
  buildFinalBookMarkdown,
  buildFinalBookHtml,
  buildFinalBookPdf,
  exportFinalBookMarkdown,
  exportFinalBookHtml,
  exportFinalBookPdf,
};
