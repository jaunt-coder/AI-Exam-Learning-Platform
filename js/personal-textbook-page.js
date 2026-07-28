/**
 * Sprint-18A — Personal AI Textbook + Final Revision Book page controller
 */

import {
  listTextbookEntries,
  getTextbookEntry,
  toggleBookmark,
  isBookmarked,
  toggleFavoriteFormula,
  savePersonalNote,
  getPersonalNote,
  getWeakCollection,
  getSummaryHistory,
  getTextbookDashboardStats,
  setTags,
  listTagsForQuestion,
} from './personal-textbook/textbook-engine.js';
import { searchTextbook, getPatternTree, FILTERS } from './personal-textbook/textbook-search.js';
import {
  exportTextbookMarkdown,
  exportTextbookHtml,
  exportTextbookPdf,
} from './personal-textbook/textbook-export.js';
import {
  loadTextbookSession,
  saveTextbookSession,
  selectTextbookEntry,
} from './personal-textbook/textbook-session.js';
import {
  createFinalRevisionBook,
  getActiveFinalBook,
  maybeAutoCreateFinalBook,
} from './final-revision/final-book-engine.js';
import {
  exportFinalBookMarkdown,
  exportFinalBookHtml,
  exportFinalBookPdf,
} from './final-revision/final-book-export.js';
import { mountQuickReview } from './final-revision/quick-review.js';

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function $(id) {
  return document.getElementById(id);
}

function queryParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch (_e) {
    return null;
  }
}

function renderTree(entries) {
  const tree = getPatternTree(entries);
  const host = $('tb-tree');
  if (!host) return;
  if (!tree.length) {
    host.innerHTML = '<p class="ll-hint">아직 저장된 해설이 없습니다. 문제를 풀면 자동 저장됩니다.</p>';
    return;
  }
  host.innerHTML = tree
    .map(
      (ch) => `
      <details class="tb-tree__chapter" open>
        <summary>${esc(ch.chapter)}</summary>
        <ul>
          ${ch.patterns
            .map(
              (p) => `
            <li>
              <button type="button" class="tb-tree__btn" data-pattern="${esc(p.patternId)}" data-chapter="${esc(ch.chapter)}">
                ${esc(p.patternName)}
                <span class="tb-tree__meta">${p.count} · 오답 ${p.wrong}</span>
              </button>
            </li>`,
            )
            .join('')}
        </ul>
      </details>`,
    )
    .join('');

  host.querySelectorAll('[data-pattern]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const patternId = btn.getAttribute('data-pattern');
      const chapter = btn.getAttribute('data-chapter');
      const match = entries.find((e) => e.patternId === patternId);
      selectTextbookEntry({
        chapter,
        patternId,
        questionId: match?.questionId || null,
      });
      paintCenter(match?.questionId || null, entries);
    });
  });
}

function renderCenter(entry) {
  const host = $('tb-center');
  if (!host) return;
  if (!entry) {
    host.innerHTML = '<p class="ll-hint">좌측 Pattern을 선택하거나 검색하세요.</p>';
    return;
  }
  const history = entry.patternId ? getSummaryHistory(entry.patternId) : [];
  host.innerHTML = `
    <article class="tb-entry" data-qid="${esc(entry.questionId)}">
      <header class="tb-entry__head">
        <h3>${esc(entry.questionId)}</h3>
        <p class="tb-meta">
          ${entry.correct ? '정답' : '오답'} · ${esc(entry.patternName)} · ${esc(entry.date)} ${esc(entry.time)}
          · Mastery ${esc(entry.mastery ?? '—')}
        </p>
      </header>
      <section>
        <h4>AI 해설</h4>
        <p>${esc(entry.geminiExplanation || '—')}</p>
      </section>
      <section>
        <h4>오답 이유</h4>
        <ul>${(entry.whyOthersWrong || []).map((x) => `<li>${esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
      </section>
      <section>
        <h4>공식
          ${(entry.formula || [])
            .map(
              (f) =>
                `<button type="button" class="button button--ghost button--sm" data-fav-formula="${esc(f)}">★</button>`,
            )
            .join('')}
        </h4>
        <ul>${(entry.formula || []).map((f) => `<li>${esc(f)}</li>`).join('') || '<li>—</li>'}</ul>
      </section>
      <section>
        <h4>계산</h4>
        <ol>${(entry.calculation || []).map((c) => `<li>${esc(c)}</li>`).join('') || '<li>—</li>'}</ol>
      </section>
      <section>
        <h4>Thinking Order</h4>
        <ol>${(entry.thinkingOrder || []).map((c) => `<li>${esc(c)}</li>`).join('') || '<li>—</li>'}</ol>
      </section>
      <section>
        <h4>Tutor · Prescription</h4>
        <p>${esc(entry.tutorAdvice || '—')}</p>
        <p>${esc(entry.prescription || '—')}</p>
        <p>Mistake: ${esc(entry.mistakeDiagnosis || '—')} · Confidence: ${esc(entry.confidence ?? '—')}</p>
      </section>
      <section>
        <h4>Pattern AI Summary (Version History)</h4>
        <ul class="tb-history">
          ${history
            .slice()
            .reverse()
            .map(
              (h) =>
                `<li><strong>v${esc(h.version)}</strong> ${h.current ? '(현재)' : ''} — <pre>${esc(h.body)}</pre></li>`,
            )
            .join('') || '<li>3문제 이상 풀면 자동 생성됩니다.</li>'}
        </ul>
      </section>
    </article>`;

  host.querySelectorAll('[data-fav-formula]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleFavoriteFormula(btn.getAttribute('data-fav-formula'), {
        questionId: entry.questionId,
        patternId: entry.patternId,
      });
      btn.classList.add('is-on');
    });
  });
}

function renderRight(entry) {
  const host = $('tb-right');
  if (!host) return;
  if (!entry) {
    const weak = getWeakCollection();
    host.innerHTML = `
      <div class="tb-weak">
        <h4>${esc(weak.titleWeakFormula)}</h4>
        <ul>${(weak.weakFormulas || []).slice(0, 5).map((f) => `<li>${esc(f.formula)}</li>`).join('') || '<li>—</li>'}</ul>
        <h4>${esc(weak.titleWeakPattern)}</h4>
        <ul>${(weak.weakPatterns || []).slice(0, 5).map((p) => `<li>${esc(p.patternName)}</li>`).join('') || '<li>—</li>'}</ul>
      </div>`;
    return;
  }
  const note = getPersonalNote(entry.questionId);
  const tags = listTagsForQuestion(entry.questionId);
  const starred = isBookmarked(entry.questionId);
  host.innerHTML = `
    <div class="tb-right-tools">
      <button type="button" class="button button--ghost" id="tb-star" aria-pressed="${starred}">
        ${starred ? '★' : '☆'} 즐겨찾기
      </button>
      <label>
        태그 (쉼표 구분)
        <input type="text" id="tb-tags" value="${esc(tags.join(', '))}">
      </label>
      <button type="button" class="button button--sm" id="tb-tags-save">태그 저장</button>
      <label>
        메모
        <textarea id="tb-note" rows="8">${esc(note?.text || '')}</textarea>
      </label>
      <button type="button" class="button button--primary button--sm" id="tb-note-save">메모 저장</button>
    </div>`;

  $('tb-star')?.addEventListener('click', () => {
    toggleBookmark(entry.questionId);
    paintCenter(entry.questionId);
  });
  $('tb-note-save')?.addEventListener('click', () => {
    savePersonalNote(entry.questionId, $('tb-note')?.value || '');
    $('tb-status').textContent = '메모가 저장되었습니다.';
  });
  $('tb-tags-save')?.addEventListener('click', () => {
    const raw = $('tb-tags')?.value || '';
    setTags(
      entry.questionId,
      raw.split(',').map((t) => t.trim()).filter(Boolean),
    );
    $('tb-status').textContent = '태그가 저장되었습니다.';
  });
}

function paintCenter(questionId, allEntries) {
  const entries = allEntries || listTextbookEntries();
  const entry = questionId
    ? getTextbookEntry(questionId) || entries.find((e) => e.questionId === questionId)
    : entries[0] || null;
  renderCenter(entry);
  renderRight(entry);
}

function refreshList() {
  const query = $('tb-query')?.value || '';
  const filter = $('tb-filter')?.value || FILTERS.ALL;
  const entries = searchTextbook(query, { filter });
  const stats = getTextbookDashboardStats();
  $('tb-status').textContent = `총 ${stats.pageCount}페이지 · 저장 ${stats.savedQuestions}문항 · ★ ${stats.bookmarkCount} · AI Summary ${stats.aiSummaryCount}`;
  renderTree(entries);
  const session = loadTextbookSession();
  const q = queryParam('q') || session.selectedQuestionId || entries[0]?.questionId || null;
  if (q) selectTextbookEntry({ questionId: q });
  paintCenter(q, entries);
  saveTextbookSession({ query, filter });
}

function renderFinalPanel() {
  maybeAutoCreateFinalBook();
  const book = getActiveFinalBook();
  const host = $('fb-panel');
  if (!host) return;
  if (!book) {
    host.innerHTML = '<p class="ll-hint">아직 최종 정리집이 없습니다. 버튼을 눌러 생성하세요.</p>';
    return;
  }
  host.innerHTML = `
    <p><strong>${esc(book.title)}</strong> · ${esc(book.createdAt)} · ${book.pageCount || 0}페이지</p>
    <p>Weak Pattern: ${esc(book.weakPatternRanking?.[0]?.patternName || '—')}</p>
    <p>Weak Formula: ${esc(book.formulaRanking?.[0]?.formula || '—')}</p>
    <ul>
      ${(book.sections || [])
        .map((s) => `<li>${esc(s.title)} (${(s.items || []).length})</li>`)
        .join('')}
    </ul>`;
  const quickHost = $('fb-quick');
  if (quickHost && book.quickReview) mountQuickReview(quickHost, book.quickReview);
}

function boot() {
  refreshList();
  renderFinalPanel();

  $('tb-query')?.addEventListener('input', () => refreshList());
  $('tb-filter')?.addEventListener('change', () => refreshList());
  $('tb-export-md')?.addEventListener('click', () => exportTextbookMarkdown());
  $('tb-export-html')?.addEventListener('click', () => exportTextbookHtml());
  $('tb-export-pdf')?.addEventListener('click', () => exportTextbookPdf());

  $('fb-create')?.addEventListener('click', () => {
    const res = createFinalRevisionBook({ trigger: 'manual' });
    $('tb-status').textContent = res.ok
      ? '시험 직전 AI 정리집이 생성되었습니다.'
      : '생성 실패';
    renderFinalPanel();
  });
  $('fb-export-md')?.addEventListener('click', () => exportFinalBookMarkdown());
  $('fb-export-html')?.addEventListener('click', () => exportFinalBookHtml());
  $('fb-export-pdf')?.addEventListener('click', () => exportFinalBookPdf());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
