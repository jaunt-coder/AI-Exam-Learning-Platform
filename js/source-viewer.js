/**
 * Sprint-09A Official Source Navigator
 * Presentation + Source Mapping + QA entry points.
 * Does not modify Question DB / Parser / OCR.
 */

import { openProblemReportModal } from './problem-report.js';

const MAP_URL = 'data/question-source-map.json';

/** @type {object|null} */
let mapCache = null;
/** @type {Promise<object>|null} */
let mapPromise = null;

/**
 * Load question-source-map.json (cached).
 * @returns {Promise<object>}
 */
export async function loadSourceMap() {
  if (mapCache) return mapCache;
  if (mapPromise) return mapPromise;
  mapPromise = (async () => {
    try {
      const res = await fetch(MAP_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mapCache = await res.json();
      return mapCache;
    } catch (err) {
      console.error('[SourceViewer] map load failed:', err?.message || err);
      mapCache = { schema: 'learning.question-source-map.v1', entries: {} };
      return mapCache;
    } finally {
      mapPromise = null;
    }
  })();
  return mapPromise;
}

function normalizeEntry(questionId, entry) {
  if (!entry) return { available: false, reason: 'not_in_map' };
  const qNo =
    entry.questionNo ??
    entry.questionNumber ??
    (() => {
      const m = String(questionId || '').match(/Q(\d+)$/i);
      return m ? Number(m[1]) : null;
    })();
  return {
    ...entry,
    questionNo: qNo,
    questionNumber: entry.questionNumber ?? qNo,
  };
}

/**
 * @param {string} questionId
 */
export async function getSourceEntry(questionId) {
  if (!questionId) return null;
  const map = await loadSourceMap();
  return normalizeEntry(questionId, map?.entries?.[questionId] || null);
}

/**
 * @param {{ pdf: string, page?: number }} entry
 */
export function buildPdfUrl(entry) {
  if (!entry?.pdf) return null;
  const base = String(entry.pdf).replace(/\\/g, '/');
  const page = Number(entry.page);
  if (Number.isFinite(page) && page > 0) {
    return `${base}#page=${page}`;
  }
  return base;
}

/**
 * @param {string} questionId
 */
export async function openOfficialSource(questionId) {
  const entry = await getSourceEntry(questionId);
  if (!entry?.available || !entry.pdf) {
    return { ok: false, reason: entry?.reason || 'unavailable' };
  }
  const url = buildPdfUrl(entry);
  if (!url) return { ok: false, reason: 'bad_url' };
  window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ensureOverlayRoot() {
  let root = document.getElementById('source-nav-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'source-nav-root';
    document.body.appendChild(root);
  }
  return root;
}

/**
 * WP-03 / WP-04 — Navigator overlay with Question Finder helpers.
 * @param {string} questionId
 */
export async function openSourceNavigator(questionId) {
  const entry = await getSourceEntry(questionId);
  const root = ensureOverlayRoot();
  const available = Boolean(entry?.available && entry.pdf);
  const year = entry?.year ?? '—';
  const page = entry?.page ?? '—';
  const qNo = entry?.questionNo ?? '—';
  const findToken = qNo !== '—' && qNo != null ? `${qNo}.` : '';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  root.innerHTML = `
    <div class="sn-backdrop" data-sn-close></div>
    <div class="sn-modal" role="dialog" aria-modal="true" aria-labelledby="sn-title">
      <header class="sn-modal__head">
        <h2 id="sn-title" class="sn-modal__title">원본 시험지</h2>
        <button type="button" class="sn-icon-btn" data-sn-close aria-label="닫기">×</button>
      </header>
      <div class="sn-modal__body">
        <dl class="sn-facts">
          <div><dt>연도</dt><dd>${escapeHtml(String(year))}년</dd></div>
          <div><dt>페이지</dt><dd>${escapeHtml(String(page))}페이지</dd></div>
          <div><dt>문항 번호</dt><dd>${escapeHtml(String(qNo))}번</dd></div>
          <div><dt>문제 ID</dt><dd><code>${escapeHtml(questionId)}</code></dd></div>
        </dl>

        <section class="sn-finder" aria-label="Question Finder">
          <h3 class="sn-finder__title">문항 찾기</h3>
          ${
            available
              ? isMobile
                ? `<p class="sn-finder__desc">PDF를 연 뒤, 뷰어 검색에서 문항 번호 <strong>${escapeHtml(String(qNo))}</strong> 또는 <strong>${escapeHtml(findToken)}</strong> 를 입력하세요.</p>`
                : `<p class="sn-finder__desc">PDF를 연 뒤 <kbd>Ctrl</kbd>+<kbd>F</kbd> 로 <strong>${escapeHtml(findToken || String(qNo))}</strong> 를 검색하세요. 자동 검색은 하지 않습니다.</p>`
              : `<p class="sn-finder__desc">원본 연결 준비중입니다. PDF가 연결되면 페이지·문항 번호로 찾을 수 있습니다.</p>`
          }
          <div class="sn-finder__actions">
            <button type="button" class="button button--ghost button--touch" data-sn-copy
              ${findToken ? '' : 'disabled'}>문항 번호 복사 (${escapeHtml(findToken || '—')})</button>
          </div>
          <p class="sn-status" data-sn-status role="status"></p>
        </section>
      </div>
      <footer class="sn-modal__foot">
        <button type="button" class="button button--ghost button--touch" data-sn-close>닫기</button>
        <button type="button" class="button button--primary button--touch" data-sn-open-pdf
          ${available ? '' : 'disabled'}>
          ${available ? 'PDF 열기' : '원본 연결 준비중'}
        </button>
      </footer>
    </div>
  `;

  const close = () => {
    root.innerHTML = '';
  };

  root.querySelectorAll('[data-sn-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  root.querySelector('[data-sn-copy]')?.addEventListener('click', async () => {
    const status = root.querySelector('[data-sn-status]');
    try {
      await navigator.clipboard.writeText(findToken || String(qNo));
      if (status) status.textContent = `"${findToken || qNo}" 복사됨 · PDF에서 붙여넣어 검색하세요.`;
    } catch {
      if (status) status.textContent = `복사 실패 · 직접 입력: ${findToken || qNo}`;
    }
  });

  root.querySelector('[data-sn-open-pdf]')?.addEventListener('click', async () => {
    const r = await openOfficialSource(questionId);
    if (!r.ok) {
      const status = root.querySelector('[data-sn-status]');
      if (status) status.textContent = '원본 연결 준비중';
      return;
    }
  });
}

/**
 * Mount Official Source + Problem Report controls.
 * @param {HTMLElement|null} host
 * @param {string|null} questionId
 */
export async function mountSourceViewerButton(host, questionId) {
  if (!host) return;

  host.classList.add('source-viewer');
  host.innerHTML = `
    <div class="source-viewer__actions">
      <button type="button" class="button button--ghost button--touch source-viewer__btn"
        data-source-open disabled aria-disabled="true">
        <span class="source-viewer__icon" aria-hidden="true">📄</span>
        <span class="source-viewer__label">원본 시험지</span>
      </button>
      <button type="button" class="button button--ghost button--touch source-viewer__btn source-viewer__btn--report"
        data-problem-report ${questionId ? '' : 'disabled'}>
        <span class="source-viewer__icon" aria-hidden="true">🐞</span>
        <span class="source-viewer__label">문제 수정 요청</span>
      </button>
    </div>
    <p class="source-viewer__hint" data-source-hint>원본 연결 준비중</p>
  `;

  const btn = host.querySelector('[data-source-open]');
  const reportBtn = host.querySelector('[data-problem-report]');
  const hint = host.querySelector('[data-source-hint]');

  if (!questionId) {
    if (hint) hint.textContent = '원본 연결 준비중';
    return;
  }

  reportBtn?.addEventListener('click', () => {
    openProblemReportModal(questionId);
  });

  const entry = await getSourceEntry(questionId);
  const available = Boolean(entry?.available && entry.pdf);

  if (btn) {
    btn.disabled = false;
    btn.setAttribute('aria-disabled', 'false');
    btn.title = available
      ? `${entry.pdf} · p.${entry.page} · Q${entry.questionNo}`
      : '원본 연결 준비중';
    btn.classList.toggle('is-pending', !available);
    btn.addEventListener('click', () => openSourceNavigator(questionId));
  }
  if (hint) {
    if (available) {
      hint.hidden = true;
      hint.textContent = '';
    } else {
      hint.hidden = false;
      hint.textContent = '원본 연결 준비중';
    }
  }
}

/** LocalStorage — legacy Sprint-09 flag (kept) */
const SOURCE_REVIEW_KEY = 'learning.sourceReview.v1';

export function markSourceReviewNeeded(questionId, meta = {}) {
  if (!questionId) return false;
  try {
    const raw = localStorage.getItem(SOURCE_REVIEW_KEY);
    const bag = raw ? JSON.parse(raw) : { schema: SOURCE_REVIEW_KEY, items: [] };
    if (!Array.isArray(bag.items)) bag.items = [];
    bag.items.push({
      question_id: questionId,
      flagged_at: new Date().toISOString(),
      session_id: meta.session_id || null,
      note: '원본 확인 필요',
    });
    bag.updated_at = new Date().toISOString();
    localStorage.setItem(SOURCE_REVIEW_KEY, JSON.stringify(bag));
    return true;
  } catch (err) {
    console.error('[SourceViewer] review flag save failed:', err?.message || err);
    return false;
  }
}

export function listSourceReviewFlags() {
  try {
    const raw = localStorage.getItem(SOURCE_REVIEW_KEY);
    const bag = raw ? JSON.parse(raw) : { items: [] };
    return Array.isArray(bag.items) ? bag.items : [];
  } catch {
    return [];
  }
}

export default {
  loadSourceMap,
  getSourceEntry,
  buildPdfUrl,
  openOfficialSource,
  openSourceNavigator,
  mountSourceViewerButton,
  markSourceReviewNeeded,
  listSourceReviewFlags,
  SOURCE_REVIEW_KEY,
};
