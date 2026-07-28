/**
 * Sprint-12A — Reviewer Mode Panel UI
 */

import { REVIEW_FLAGS, REVIEW_STATUSES } from './review-storage.js';
import {
  getOverride,
  saveOverride,
  resolveQuestion,
  hasOverride,
} from './override-service.js';
import {
  getReviewRecord,
  upsertReviewRecord,
  getQuestionBadge,
  exportReviewPack,
  importReviewPack,
} from './review-service.js';
import { getReviewHistory, undoReview, appendReviewHistory } from './review-history.js';
import { createTableEditor } from './table-editor.js';
import { createChoiceEditor } from './choice-editor.js';
import { createPatternEditor } from './pattern-editor.js';
import {
  runAiRecovery,
  approveByField,
  approveAll,
  rejectChanges,
  skipChanges,
  exportSuggestionsJson,
  importSuggestionsJson,
} from '../recovery/ai-recovery-service.js';
import { diffToneClass } from '../recovery/diff-engine.js';
import {
  evaluateSolutionQuality,
  applyAiImprovementToOverride,
  approveSolutionQuality,
  renderReviewerQualityPanel,
} from '../solution-quality/solution-quality-engine.js';
import { loadSolutionCache } from '../solution-engine/cache.js';
import { generateSolutionPack } from '../solution-engine/solution-engine.js';
import {
  solveWithGeminiSync,
  approveGeminiToOverride,
  payloadToMarkdown,
} from '../gemini-solver/gemini-orchestrator.js';
import { peekCachedGemini, buildGeminiCacheKey } from '../gemini-solver/cache-manager.js';
import { resolveOverrideVersion } from '../gemini-solver/problem-reader.js';
import { MODEL_VERSION } from '../gemini-solver/problem-solver.js';
import { PROMPT_VERSION } from '../gemini-solver/prompt-builder.js';
import { normalizeGeminiPayload } from '../gemini-solver/response-parser.js';
import {
  generateProfessorExplanationSync,
  approveProfessorToOverride,
  professorPayloadToMarkdown,
} from '../professor-explanation/professor-engine.js';
import {
  peekProfessorCache,
  buildProfessorCacheKey,
} from '../professor-explanation/professor-cache.js';
import { PROFESSOR_PROMPT_VERSION } from '../professor-explanation/professor-prompt.js';
import { reviewExplanationQuality } from '../professor-explanation/explanation-quality-reviewer.js';
import { normalizeProfessorPayload } from '../professor-explanation/professor-normalize.js';
import {
  recoverQuestionWithVision,
  approveVisionToOverride,
  scoreOcrQuality,
} from '../gemini-vision/vision-recovery.js';
import { peekVisionCache, buildVisionCacheKey } from '../gemini-vision/vision-cache.js';
import { locateQuestionSync } from '../gemini-vision/question-locator.js';
import { VISION_MODEL, VISION_PROMPT_VERSION } from '../gemini-vision/vision-utils.js';
import { loadVisionConfig } from '../gemini-vision/vision-storage.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render badge into host element.
 * @param {HTMLElement|null} host
 * @param {object} question
 */
export function renderQuestionBadge(host, question) {
  if (!host) return;
  const badge = getQuestionBadge(question);
  host.innerHTML = `<span class="rv-badge rv-badge--${badge.tone}" title="Review status">${escapeHtml(badge.label)}</span>`;
}

/**
 * Mount Reviewer toggle button (top-right).
 * @param {HTMLElement|null} host
 * @param {() => void} onClick
 */
export function mountReviewerButton(host, onClick) {
  if (!host) return null;
  host.innerHTML = '';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'reviewer-mode-btn';
  btn.className = 'button button--ghost button--touch rv-reviewer-btn';
  btn.textContent = 'Reviewer';
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    if (typeof onClick === 'function') onClick();
  });
  host.appendChild(btn);
  return btn;
}

/**
 * Open / manage Reviewer panel for a question.
 * @param {{
 *   panelEl: HTMLElement,
 *   originalQuestion: object,
 *   onResolved?: (resolved: object) => void,
 *   entryMode?: boolean,
 *   onApprove?: (resolved: object) => void,
 *   onReject?: () => void,
 *   onSkip?: () => void,
 *   onNext?: () => void,
 * }} options
 */
export function openReviewerPanel(options = {}) {
  const panel = options.panelEl;
  const original = options.originalQuestion;
  if (!panel || !original) return;

  const qid = original.questionId || original.id;
  let draftText = '';
  let draftTable = '';
  let draftChoices = Array.isArray(original.choices)
    ? original.choices.slice()
    : [];
  let draftSolution = '';
  let draftFlags = [];
  let draftStatus = 'REVIEWED';
  let draftNote = '';
  let patternEditor = null;

  const ov = getOverride(qid);
  const review = getReviewRecord(qid);
  draftText =
    ov?.override?.question ??
    original.question ??
    original.originalQuestion ??
    '';
  draftTable =
    ov?.override?.table !== undefined
      ? ov.override.table
      : original.table || '';
  draftChoices = Array.isArray(ov?.override?.choices)
    ? ov.override.choices.slice()
    : Array.isArray(original.choices)
      ? original.choices.slice()
      : [];
  draftSolution =
    ov?.override?.solution?.explanation ||
    ov?.override?.solution?.summary ||
    original.solution?.explanation ||
    original.solution?.summary ||
    '';
  draftFlags = Array.isArray(review.flags) ? review.flags.slice() : [];
  draftStatus = review.status || 'REVIEWED';
  draftNote = review.note || '';

  const source = original.source || {};
  const pdfLink = source.sourceFile
    ? String(source.sourceFile)
    : '';

  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');

  const flagChecks = REVIEW_FLAGS.map(
    (f) => `
    <label class="rv-flag">
      <input type="checkbox" data-flag="${f}" ${draftFlags.includes(f) ? 'checked' : ''}>
      <span>${f}</span>
    </label>`,
  ).join('');

  const statusOptions = REVIEW_STATUSES.map(
    (s) =>
      `<option value="${s}" ${s === draftStatus ? 'selected' : ''}>${s}</option>`,
  ).join('');

  panel.innerHTML = `
    <div class="rv-panel-header">
      <h3>Reviewer Mode</h3>
      <p class="rv-panel-desc">Override Layer only · Question DB Read Only</p>
      <button type="button" class="button button--ghost" data-act="close" aria-label="닫기">닫기</button>
    </div>

    <div class="rv-tabs" role="tablist">
      <button type="button" class="rv-tab is-active" data-tab="text">문제</button>
      <button type="button" class="rv-tab" data-tab="table">표</button>
      <button type="button" class="rv-tab" data-tab="choices">보기</button>
      <button type="button" class="rv-tab" data-tab="solution">해설</button>
      <button type="button" class="rv-tab" data-tab="pattern">Pattern</button>
      <button type="button" class="rv-tab" data-tab="source">PDF</button>
      <button type="button" class="rv-tab" data-tab="flags">Flags</button>
      <button type="button" class="rv-tab" data-tab="ai-recovery">AI Recovery</button>
      <button type="button" class="rv-tab" data-tab="solution-quality">Solution Quality</button>
      <button type="button" class="rv-tab" data-tab="history">History</button>
    </div>

    <div class="rv-tab-panels">
      <section class="rv-tab-panel is-active" data-panel="text">
        <label class="rv-field">
          <span>Question Text / OCR 수정</span>
          <textarea id="rv-question-text" rows="8">${escapeHtml(draftText)}</textarea>
        </label>
        <div class="rv-preview" id="rv-text-preview" aria-live="polite"></div>
      </section>

      <section class="rv-tab-panel" data-panel="table" hidden>
        <div id="rv-table-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="choices" hidden>
        <div id="rv-choice-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="solution">
        <label class="rv-field">
          <span>Solution Override</span>
          <textarea id="rv-solution-text" rows="6">${escapeHtml(draftSolution)}</textarea>
        </label>
      </section>

      <section class="rv-tab-panel" data-panel="pattern" hidden>
        <div id="rv-pattern-editor"></div>
      </section>

      <section class="rv-tab-panel" data-panel="source" hidden>
        <dl class="rv-dl">
          <div><dt>Question Source</dt><dd>${escapeHtml(source.sourceKind || source.type || '—')}</dd></div>
          <div><dt>Page</dt><dd>${escapeHtml(source.page ?? '—')}</dd></div>
          <div><dt>Question Number</dt><dd>${escapeHtml(source.questionNumber ?? '—')}</dd></div>
          <div><dt>Year</dt><dd>${escapeHtml(source.year ?? original.year ?? '—')}</dd></div>
          <div><dt>원본 PDF</dt><dd>${
            pdfLink
              ? `<a href="${escapeHtml(pdfLink)}" target="_blank" rel="noopener">${escapeHtml(pdfLink)}</a>`
              : '—'
          }</dd></div>
        </dl>
      </section>

      <section class="rv-tab-panel" data-panel="flags" hidden>
        <label class="rv-field">
          <span>Review Status</span>
          <select id="rv-status">${statusOptions}</select>
        </label>
        <div class="rv-flags">${flagChecks}</div>
        <label class="rv-field">
          <span>Reviewer Note (Markdown)</span>
          <textarea id="rv-note" rows="5" placeholder="메모">${escapeHtml(draftNote)}</textarea>
        </label>
        <div class="rv-preview rv-md-preview" id="rv-note-preview"></div>
      </section>

      <section class="rv-tab-panel" data-panel="ai-recovery" hidden>
        <div id="rv-ai-recovery-root">
          <p class="rv-empty">AI Recovery를 실행하려면 탭을 다시 선택하세요.</p>
        </div>
      </section>

      <section class="rv-tab-panel" data-panel="solution-quality" hidden>
        <div id="rv-solution-quality-root">
          <p class="rv-empty">Solution Quality를 불러오려면 탭을 선택하세요.</p>
        </div>
      </section>

      <section class="rv-tab-panel" data-panel="history" hidden>
        <div id="rv-history-list"></div>
        <div class="rv-actions">
          <button type="button" class="button button--ghost" data-act="undo">Undo 마지막 수정</button>
          <button type="button" class="button button--ghost" data-act="export">Export Override JSON</button>
          <label class="button button--ghost rv-import-label">
            Import Override JSON
            <input type="file" id="rv-import-file" accept="application/json,.json" hidden>
          </label>
        </div>
      </section>
    </div>

    <div class="rv-panel-footer">
      <button type="button" class="button button--primary" data-act="save">Override 저장</button>
      <button type="button" class="button button--ghost" data-act="apply-preview">Preview 적용</button>
      ${
        options.entryMode
          ? `
      <button type="button" class="button button--primary" data-act="approve">Approve</button>
      <button type="button" class="button button--ghost" data-act="reject">Reject</button>
      <button type="button" class="button button--ghost" data-act="skip">Skip</button>
      <button type="button" class="button button--ghost" data-act="next">Next</button>`
          : ''
      }
    </div>
  `;

  const textArea = panel.querySelector('#rv-question-text');
  const textPreview = panel.querySelector('#rv-text-preview');
  const solutionArea = panel.querySelector('#rv-solution-text');
  const statusSelect = panel.querySelector('#rv-status');
  const noteArea = panel.querySelector('#rv-note');
  const notePreview = panel.querySelector('#rv-note-preview');

  const refreshTextPreview = () => {
    if (textPreview) {
      textPreview.textContent = textArea?.value || '';
    }
  };
  textArea?.addEventListener('input', () => {
    draftText = textArea.value;
    refreshTextPreview();
  });
  refreshTextPreview();

  const refreshNotePreview = () => {
    if (notePreview) {
      notePreview.innerHTML = simpleMarkdown(noteArea?.value || '');
    }
  };
  noteArea?.addEventListener('input', () => {
    draftNote = noteArea.value;
    refreshNotePreview();
  });
  refreshNotePreview();

  const tableEditor = createTableEditor({
    initialTable: draftTable,
    onChange: (md) => {
      draftTable = md;
    },
  });
  tableEditor.mount(panel.querySelector('#rv-table-editor'));

  const choiceEditor = createChoiceEditor({
    initialChoices: draftChoices,
    onChange: (list) => {
      draftChoices = list;
    },
  });
  choiceEditor.mount(panel.querySelector('#rv-choice-editor'));

  patternEditor = createPatternEditor({
    questionId: qid,
    currentPatternId: original.patternId,
    onChange: () => {},
  });
  patternEditor.mount(panel.querySelector('#rv-pattern-editor'));

  function renderHistory() {
    const host = panel.querySelector('#rv-history-list');
    if (!host) return;
    const hist = getReviewHistory(qid);
    if (!hist.length) {
      host.innerHTML = '<p class="rv-empty">History 없음</p>';
      return;
    }
    host.innerHTML = `
      <ul class="rv-history">
        ${hist
          .slice()
          .reverse()
          .map(
            (h) => `
          <li>
            <strong>v${h.version}</strong>
            · ${escapeHtml(h.reviewer || 'local')}
            · ${escapeHtml(h.time || '')}
            · ${escapeHtml((h.changedFields || []).join(', ') || '—')}
          </li>`,
          )
          .join('')}
      </ul>`;
  }
  renderHistory();

  let recoveryPack = null;

  function renderAiRecoveryTab() {
    const root = panel.querySelector('#rv-ai-recovery-root');
    if (!root) return;
    root.innerHTML = '<p class="rv-empty">AI Recovery 실행 중…</p>';
    try {
      recoveryPack = runAiRecovery(original);
    } catch (err) {
      root.innerHTML = `<p class="rv-empty">Recovery 실패: ${escapeHtml(err?.message || 'unknown')}</p>`;
      return;
    }
    const pack = recoveryPack;
    const pdf = pack.pdfMeta || {};
    const changeBlocks = (pack.changes || [])
      .map((c, idx) => {
        const diff = (pack.diffs || [])[idx];
        return `
        <article class="ocr-change-card" data-change-idx="${idx}">
          <header>
            <strong>${escapeHtml(c.field)}</strong>
            <span class="ocr-conf ocr-conf--${escapeHtml(c.level || 'LOW')}">${escapeHtml(String(c.confidence ?? ''))} · ${escapeHtml(c.level || '')}</span>
          </header>
          <p class="ocr-explain">${escapeHtml(c.explain || '')}</p>
          <div class="ocr-compare">
            <div class="ocr-pane">
              <h5>Current</h5>
              <pre>${escapeHtml(formatChangeValue(c.before))}</pre>
            </div>
            <div class="ocr-pane">
              <h5>AI Suggestion</h5>
              <pre>${escapeHtml(formatChangeValue(c.after))}</pre>
            </div>
          </div>
          ${renderDiffHtml(diff)}
          <div class="rv-actions">
            <button type="button" class="button button--ghost" data-approve-field="${escapeHtml(c.field)}">Approve ${escapeHtml(c.field)}</button>
          </div>
        </article>`;
      })
      .join('');

    root.innerHTML = `
      <div class="ocr-summary">
        <p><strong>Confidence</strong> ${escapeHtml(String(pack.confidence))} (${escapeHtml(pack.level)})</p>
        <p><strong>Quality Score</strong> ${escapeHtml(pack.qualityScore ?? '—')} · ${escapeHtml(pack.qualityStatus || '—')}</p>
        <p><strong>Detections</strong> ${escapeHtml((pack.detections || []).join(', ') || '—')}</p>
        <dl class="rv-dl">
          <div><dt>Page</dt><dd>${escapeHtml(pdf.page ?? '—')}</dd></div>
          <div><dt>Question Number</dt><dd>${escapeHtml(pdf.questionNumber ?? '—')}</dd></div>
          <div><dt>PDF</dt><dd>${
            pdf.pdfUrl
              ? `<a href="${escapeHtml(pdf.pdfUrl)}" target="_blank" rel="noopener">원본 PDF 열기</a>`
              : '—'
          }</dd></div>
        </dl>
      </div>
      <div class="rv-actions">
        <button type="button" class="button button--primary" data-ocr-act="approve-all">Approve All</button>
        <button type="button" class="button button--ghost" data-ocr-act="reject">Reject</button>
        <button type="button" class="button button--ghost" data-ocr-act="skip">Skip</button>
        <button type="button" class="button button--ghost" data-ocr-act="export">Export Suggestions</button>
        <label class="button button--ghost rv-import-label">
          Import Suggestions
          <input type="file" id="rv-recovery-import" accept="application/json,.json" hidden>
        </label>
      </div>
      <div class="ocr-change-list">${changeBlocks || '<p class="rv-empty">제안 없음</p>'}</div>
    `;

    root.querySelectorAll('[data-approve-field]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-approve-field');
        approveByField(qid, pack, field, pack.confidence);
        applyResolved();
        renderAiRecoveryTab();
      });
    });
    root.querySelector('[data-ocr-act="approve-all"]')?.addEventListener('click', () => {
      approveAll(qid, pack, pack.confidence);
      applyResolved();
      renderAiRecoveryTab();
    });
    root.querySelector('[data-ocr-act="reject"]')?.addEventListener('click', () => {
      rejectChanges({ questionId: qid, confidence: pack.confidence });
      renderAiRecoveryTab();
    });
    root.querySelector('[data-ocr-act="skip"]')?.addEventListener('click', () => {
      skipChanges({ questionId: qid });
      renderAiRecoveryTab();
    });
    root.querySelector('[data-ocr-act="export"]')?.addEventListener('click', () => {
      const blob = new Blob([exportSuggestionsJson()], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'learning.suggestion.v1.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    root.querySelector('#rv-recovery-import')?.addEventListener('change', async (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      importSuggestionsJson(await file.text());
      renderAiRecoveryTab();
    });
  }

  panel.querySelectorAll('.rv-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.getAttribute('data-tab');
      panel.querySelectorAll('.rv-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      panel.querySelectorAll('.rv-tab-panel').forEach((p) => {
        const on = p.getAttribute('data-panel') === name;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      if (name === 'history') renderHistory();
      if (name === 'ai-recovery') renderAiRecoveryTab();
      if (name === 'solution-quality') renderSolutionQualityTab();
    });
  });

  function renderSolutionQualityTab() {
    const root = panel.querySelector('#rv-solution-quality-root');
    if (!root || !qid) return;
    let pack = null;
    try {
      const cache = loadSolutionCache();
      const keys = Object.keys(cache.byKey || {});
      const hitKey = keys.find((k) => k.startsWith(`${qid}::`));
      pack = hitKey ? cache.byKey[hitKey]?.pack : null;
    } catch (_err) {
      pack = null;
    }
    if (!pack) {
      try {
        pack = generateSolutionPack({
          question: original,
          grade: { result: 'wrong', selected: null },
          pattern: { patternId: original.patternId },
        });
      } catch (_err) {
        pack = null;
      }
    }
    let report = null;
    try {
      report = evaluateSolutionQuality({
        questionId: qid,
        question: original,
        resolvedQuestion: resolveQuestion(original),
        pack,
        patternId: original.patternId,
      });
    } catch (err) {
      root.innerHTML = `<p class="rv-empty">Quality 평가 실패: ${escapeHtml(err?.message || err)}</p>`;
      return;
    }
    root.innerHTML = `${renderReviewerQualityPanel(report)}
      <div class="rv-gemini-panel" data-gemini-reviewer="17D" data-professor-reviewer="17D">
        <h4>AI Explanation Quality · Professor</h4>
        <p class="rv-empty">Quality Score / Missing Section / Regenerate. Markdown Override만 가능. 자동 승인 금지.</p>
        <p class="ll-hint" data-professor-quality-score>—</p>
        <textarea id="rv-gemini-md" rows="16" class="rv-field" aria-label="Professor Markdown"></textarea>
        <div class="rv-actions">
          <button type="button" class="button button--ghost" data-gemini-act="load">해설 불러오기</button>
          <button type="button" class="button button--ghost" data-gemini-act="regen">Regenerate</button>
          <button type="button" class="button button--primary" data-gemini-act="approve">Markdown Approve → Override</button>
        </div>
        <p class="sq-status" data-gemini-status hidden></p>
      </div>
      <div class="rv-vision-panel" data-vision-reviewer="17B">
        <h4>Gemini Vision OCR Recovery</h4>
        <p class="rv-empty">Vision 복원 결과를 수정 후 Approve하면 Override + Vision Cache만 갱신됩니다. Question DB 수정 금지.</p>
        <p class="ll-hint" data-ocr-score></p>
        <textarea id="rv-vision-json" rows="10" class="rv-field" aria-label="Vision JSON"></textarea>
        <div class="rv-actions">
          <button type="button" class="button button--ghost" data-vision-act="run">Vision 복원 실행</button>
          <button type="button" class="button button--ghost" data-vision-act="load">Cache 불러오기</button>
          <button type="button" class="button button--primary" data-vision-act="approve">Vision Approve → Override</button>
        </div>
        <p class="sq-status" data-vision-status hidden></p>
      </div>`;
    const statusEl = root.querySelector('[data-sq-status]');
    const geminiStatus = root.querySelector('[data-gemini-status]');
    const geminiTa = root.querySelector('#rv-gemini-md');
    const qualityScoreEl = root.querySelector('[data-professor-quality-score]');
    const visionStatus = root.querySelector('[data-vision-status]');
    const visionTa = root.querySelector('#rv-vision-json');
    const ocrScoreEl = root.querySelector('[data-ocr-score]');

    try {
      const ocr = scoreOcrQuality(resolveQuestion(original) || original);
      if (ocrScoreEl) {
        ocrScoreEl.textContent = `OCR Quality ${ocr.score}/100 · threshold ${ocr.threshold} · ${ocr.useVision ? 'Vision 권장' : 'OCR 사용'}`;
      }
    } catch (_err) {
      /* ignore */
    }

    function loadGeminiPayload() {
      try {
        const ov = getOverride(qid);
        if (ov?.override?.geminiNative?.payload) {
          return ov.override.geminiNative.payload;
        }
      } catch (_err) {
        /* ignore */
      }
      try {
        const key = buildProfessorCacheKey(
          qid,
          resolveOverrideVersion(qid),
          MODEL_VERSION,
          PROFESSOR_PROMPT_VERSION,
        );
        const cached = peekProfessorCache(key);
        if (cached?.payload) return cached.payload;
      } catch (_err) {
        /* ignore */
      }
      try {
        const key = buildGeminiCacheKey(
          qid,
          resolveOverrideVersion(qid),
          MODEL_VERSION,
          PROMPT_VERSION,
        );
        const cached = peekCachedGemini(key);
        if (cached?.payload) return cached.payload;
      } catch (_err) {
        /* ignore */
      }
      try {
        const resolved = resolveQuestion(original);
        const professor = generateProfessorExplanationSync({
          question: resolved,
          grade: { result: 'wrong', selected: null },
          pattern: { patternId: resolved.patternId || original.patternId },
        });
        return professor?.payload || null;
      } catch (_err) {
        try {
          const resolved = resolveQuestion(original);
          const gemini = solveWithGeminiSync({
            question: resolved,
            grade: { result: 'wrong', selected: null },
            pattern: { patternId: resolved.patternId || original.patternId },
          });
          return gemini?.payload || null;
        } catch (_e2) {
          return null;
        }
      }
    }

    function toGeminiMarkdown(payload) {
      if (!payload) return '';
      try {
        const ov = getOverride(qid);
        if (ov?.override?.geminiNative?.markdown) return ov.override.geminiNative.markdown;
      } catch (_err) {
        /* ignore */
      }
      if (payload.professorLevel || payload.problemUnderstanding != null) {
        return professorPayloadToMarkdown(normalizeProfessorPayload(payload));
      }
      return payloadToMarkdown(normalizeGeminiPayload(payload));
    }

    function refreshQualityScore(payload) {
      if (!qualityScoreEl) return;
      if (!payload) {
        qualityScoreEl.textContent = 'Quality Score —';
        return;
      }
      try {
        const q = reviewExplanationQuality(normalizeProfessorPayload(payload), {
          questionText: original.question || original.originalQuestion || '',
          tableHtml: original.tableHtml || original.table || '',
          choices: original.choices || [],
          correctAnswer: original.answer,
        });
        qualityScoreEl.textContent = `Quality Score ${q.score}/100 · ${q.decision} · Missing ${(q.missing || []).join(', ') || '없음'}`;
      } catch (_err) {
        qualityScoreEl.textContent = 'Quality Score —';
      }
    }

    root.querySelector('[data-gemini-act="load"]')?.addEventListener('click', () => {
      const payload = loadGeminiPayload();
      if (geminiTa) geminiTa.value = toGeminiMarkdown(payload);
      refreshQualityScore(payload);
      if (geminiStatus) {
        geminiStatus.hidden = false;
        geminiStatus.className = payload ? 'sq-status is-ok' : 'sq-status is-err';
        geminiStatus.textContent = payload
          ? 'Markdown 해설을 불러왔습니다. 수정 후 Approve 하세요. (자동 승인 금지)'
          : 'Professor/Gemini 결과를 찾지 못했습니다.';
      }
    });

    root.querySelector('[data-gemini-act="regen"]')?.addEventListener('click', () => {
      try {
        const resolved = resolveQuestion(original);
        const professor = generateProfessorExplanationSync({
          question: resolved,
          grade: { result: 'wrong', selected: null },
          pattern: { patternId: resolved.patternId || original.patternId },
          force: true,
        });
        if (geminiTa) geminiTa.value = toGeminiMarkdown(professor?.payload);
        refreshQualityScore(professor?.payload);
        if (geminiStatus) {
          geminiStatus.hidden = false;
          geminiStatus.className = 'sq-status is-ok';
          geminiStatus.textContent = `Regenerate 완료 · Score ${professor?.qualityScore ?? '—'} (Approve는 수동)`;
        }
      } catch (err) {
        if (geminiStatus) {
          geminiStatus.hidden = false;
          geminiStatus.className = 'sq-status is-err';
          geminiStatus.textContent = `Regenerate 실패: ${err?.message || err}`;
        }
      }
    });

    root.querySelector('[data-gemini-act="approve"]')?.addEventListener('click', () => {
      const markdown = geminiTa?.value || '';
      const base = loadGeminiPayload() || {};
      const res = approveProfessorToOverride(qid, base, {
        reviewer: 'reviewer',
        markdown,
      });
      if (!res.ok) {
        const legacy = approveGeminiToOverride(qid, base, {
          reviewer: 'reviewer',
          markdown,
        });
        if (geminiStatus) {
          geminiStatus.hidden = false;
          geminiStatus.className = legacy.ok ? 'sq-status is-ok' : 'sq-status is-err';
          geminiStatus.textContent = legacy.ok
            ? 'Markdown Approve 완료 · Override Layer만 반영 (Question DB 미수정)'
            : `Approve 실패: ${legacy.error || res.error || ''}`;
        }
        if (legacy.ok && typeof options.onApprove === 'function') {
          options.onApprove(resolveQuestion(original));
        } else if (legacy.ok && typeof options.onResolved === 'function') {
          options.onResolved(resolveQuestion(original));
        }
        return;
      }
      if (geminiStatus) {
        geminiStatus.hidden = false;
        geminiStatus.className = 'sq-status is-ok';
        geminiStatus.textContent =
          'Markdown Approve 완료 · Override Layer만 반영 (자동 승인 아님 · Question DB 미수정)';
      }
      if (typeof options.onApprove === 'function') {
        options.onApprove(resolveQuestion(original));
      } else if (typeof options.onResolved === 'function') {
        options.onResolved(resolveQuestion(original));
      }
    });

    function loadVisionPayload() {
      try {
        const ov = getOverride(qid);
        if (ov?.override?.visionOcr?.payload) return ov.override.visionOcr.payload;
      } catch (_err) {
        /* ignore */
      }
      try {
        const locate = locateQuestionSync(original);
        const config = loadVisionConfig();
        const key = buildVisionCacheKey(
          qid,
          locate.pdfHash,
          config.visionModel || VISION_MODEL,
          config.promptVersion || VISION_PROMPT_VERSION,
        );
        return peekVisionCache(key)?.payload || null;
      } catch (_err) {
        return null;
      }
    }

    root.querySelector('[data-vision-act="load"]')?.addEventListener('click', () => {
      const payload = loadVisionPayload();
      if (visionTa) visionTa.value = payload ? JSON.stringify(payload, null, 2) : '';
      if (visionStatus) {
        visionStatus.hidden = false;
        visionStatus.className = payload ? 'sq-status is-ok' : 'sq-status is-err';
        visionStatus.textContent = payload
          ? 'Vision Cache/Override를 불러왔습니다.'
          : 'Vision 결과를 찾지 못했습니다.';
      }
    });

    root.querySelector('[data-vision-act="run"]')?.addEventListener('click', () => {
      if (visionStatus) {
        visionStatus.hidden = false;
        visionStatus.textContent = 'Vision 복원 실행 중…';
      }
      recoverQuestionWithVision(resolveQuestion(original) || original, { forceLocal: true })
        .then((res) => {
          if (visionTa && res?.payload) {
            visionTa.value = JSON.stringify(res.payload, null, 2);
          }
          if (visionStatus) {
            visionStatus.className = res?.ok ? 'sq-status is-ok' : 'sq-status is-err';
            visionStatus.textContent = res?.ok
              ? `복원 완료 · decision ${res.decision}${res.fallback ? ' (OCR fallback)' : ''}`
              : '복원 실패';
          }
        })
        .catch((err) => {
          if (visionStatus) {
            visionStatus.className = 'sq-status is-err';
            visionStatus.textContent = `복원 오류: ${err?.message || err}`;
          }
        });
    });

    root.querySelector('[data-vision-act="approve"]')?.addEventListener('click', () => {
      let payload = null;
      try {
        payload = visionTa?.value ? JSON.parse(visionTa.value) : loadVisionPayload();
      } catch (_err) {
        payload = null;
      }
      const res = approveVisionToOverride(qid, payload, {
        reviewer: 'reviewer',
        question: original,
      });
      if (visionStatus) {
        visionStatus.hidden = false;
        visionStatus.className = res.ok ? 'sq-status is-ok' : 'sq-status is-err';
        visionStatus.textContent = res.ok
          ? 'Vision Approve 완료 · Override + Vision Cache 반영 (Question DB 미수정)'
          : `Approve 실패: ${res.error || ''}`;
      }
      if (res.ok && typeof options.onApprove === 'function') {
        options.onApprove(resolveQuestion(original));
      } else if (res.ok && typeof options.onResolved === 'function') {
        options.onResolved(resolveQuestion(original));
      }
    });

    /* auto-load once */
    const initial = loadGeminiPayload();
    if (geminiTa && initial) geminiTa.value = toGeminiMarkdown(initial);
    const initialVision = loadVisionPayload();
    if (visionTa && initialVision) visionTa.value = JSON.stringify(initialVision, null, 2);

    root.querySelector('[data-sq-act="apply-ai"]')?.addEventListener('click', () => {
      const res = applyAiImprovementToOverride(qid, report);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = res.ok ? 'sq-status is-ok' : 'sq-status is-err';
        statusEl.textContent = res.ok
          ? 'AI 개선 초안이 Override에 저장되었습니다. (NEEDS_VERIFY · 자동 승인 없음)'
          : `적용 실패: ${res.error || ''}`;
      }
      if (typeof options.onResolved === 'function') {
        options.onResolved(resolveQuestion(original));
      }
    });
    root.querySelector('[data-sq-act="edit"]')?.addEventListener('click', () => {
      panel.querySelector('[data-tab="solution"]')?.click();
    });
    root.querySelector('[data-sq-act="approve"]')?.addEventListener('click', () => {
      const res = approveSolutionQuality(qid, report, { reviewer: 'reviewer' });
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = res.ok ? 'sq-status is-ok' : 'sq-status is-err';
        statusEl.textContent = res.ok
          ? '승인 완료 · Override Layer만 반영 (DB 미수정 · 자동 승인 아님)'
          : `승인 실패: ${res.error || ''}`;
      }
      if (typeof options.onApprove === 'function') {
        options.onApprove(resolveQuestion(original));
      } else if (typeof options.onResolved === 'function') {
        options.onResolved(resolveQuestion(original));
      }
    });
  }

  function collectFlags() {
    return Array.from(panel.querySelectorAll('[data-flag]:checked')).map(
      (el) => el.getAttribute('data-flag'),
    );
  }

  function buildPatch() {
    const patternState = patternEditor?.getState?.() || {};
    const flags = collectFlags();
    if (draftTable && !flags.includes('TABLE_FIXED')) flags.push('TABLE_FIXED');
    return {
      question: textArea?.value ?? draftText,
      originalQuestion: textArea?.value ?? draftText,
      table: typeof draftTable === 'string' ? draftTable : tableEditor.getMarkdown(),
      hasTable: Boolean(
        (typeof draftTable === 'string' ? draftTable : '').trim(),
      ),
      choices: choiceEditor.getChoices(),
      solution: {
        ...(original.solution || {}),
        explanation: solutionArea?.value || '',
        summary: solutionArea?.value || '',
      },
      patternId: patternState.patternId || undefined,
      patternMemo: patternState.patternMemo || '',
      patternChangeRequest: patternState.patternChangeRequest || '',
      reviewFlags: flags,
      reviewerNote: noteArea?.value || '',
      reviewed: true,
      reviewer: 'local',
    };
  }

  function applyResolved() {
    const resolved = resolveQuestion(original);
    if (typeof options.onResolved === 'function') {
      options.onResolved(resolved);
    }
    return resolved;
  }

  panel.querySelector('[data-act="close"]')?.addEventListener('click', () => {
    closeReviewerPanel(panel);
  });

  function performSave(statusOverride) {
    const patch = buildPatch();
    const status = statusOverride || statusSelect?.value || 'REVIEWED';
    /* Approve path: saveOverride only — Question DB untouched */
    console.log('[ReviewEntry] saveOverride()', { questionId: qid, status });
    saveOverride(qid, patch, {
      status,
      reviewer: 'local',
      changedFields: [
        'question',
        'table',
        'choices',
        'solution',
        'patternId',
        'reviewFlags',
        'reviewerNote',
      ],
    });
    upsertReviewRecord(qid, {
      status,
      flags: patch.reviewFlags,
      note: patch.reviewerNote,
      reviewer: 'local',
    });
    patternEditor?.persist?.('local');
    renderHistory();
    return applyResolved();
  }

  panel.querySelector('[data-act="save"]')?.addEventListener('click', () => {
    performSave();
  });

  panel.querySelector('[data-act="apply-preview"]')?.addEventListener('click', () => {
    /* temporary in-memory preview via synthetic override save */
    const patch = buildPatch();
    saveOverride(qid, patch, {
      status: statusSelect?.value || 'REVIEWED',
      changedFields: ['preview'],
    });
    applyResolved();
  });

  panel.querySelector('[data-act="approve"]')?.addEventListener('click', () => {
    const resolved = performSave('APPROVED');
    if (typeof options.onApprove === 'function') {
      options.onApprove(resolved);
    }
  });

  panel.querySelector('[data-act="reject"]')?.addEventListener('click', () => {
    /* Reject: History only — no Question DB / no override write */
    appendRejectHistory(qid, buildPatch());
    renderHistory();
    if (typeof options.onReject === 'function') options.onReject();
  });

  panel.querySelector('[data-act="skip"]')?.addEventListener('click', () => {
    if (typeof options.onSkip === 'function') options.onSkip();
  });

  panel.querySelector('[data-act="next"]')?.addEventListener('click', () => {
    if (typeof options.onNext === 'function') options.onNext();
  });

  panel.querySelector('[data-act="undo"]')?.addEventListener('click', () => {
    undoReview(qid);
    renderHistory();
    applyResolved();
  });

  panel.querySelector('[data-act="export"]')?.addEventListener('click', () => {
    const blob = new Blob([exportReviewPack()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-overrides.v1.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  panel.querySelector('#rv-import-file')?.addEventListener('change', async (ev) => {
    const file = ev.target?.files?.[0];
    if (!file) return;
    const text = await file.text();
    importReviewPack(text);
    renderHistory();
    applyResolved();
  });

  return {
    applyResolved,
    hasOverride: () => hasOverride(qid),
    save: performSave,
    getDraftSnapshot: () => buildPatch(),
    questionId: qid,
    close: () => closeReviewerPanel(panel),
  };
}

function appendRejectHistory(questionId, snapshot) {
  try {
    appendReviewHistory({
      questionId,
      reviewer: 'local',
      changedFields: ['REJECT'],
      overrideSnapshot: snapshot || null,
      note: 'REJECT — history only',
    });
    upsertReviewRecord(questionId, {
      status: 'REJECTED',
      flags: ['HUMAN_REVIEW'],
      note: 'Rejected via Review Entry',
      reviewer: 'local',
    });
  } catch (_err) {
    /* ignore */
  }
}

export function closeReviewerPanel(panel) {
  if (!panel) return;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '';
}

function simpleMarkdown(src) {
  const escaped = escapeHtml(src);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function formatChangeValue(value) {
  if (value == null) return '(null)';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

function renderDiffHtml(diff) {
  if (!diff) return '';
  if (diff.kind === 'text' && Array.isArray(diff.lines)) {
    const rows = diff.lines
      .map((line) => {
        const cls = diffToneClass(line.type);
        if (line.type === 'add') {
          return `<div class="${cls}">+ ${escapeHtml(line.after || '')}</div>`;
        }
        if (line.type === 'delete') {
          return `<div class="${cls}">− ${escapeHtml(line.before || '')}</div>`;
        }
        if (line.type === 'change') {
          return `<div class="${cls}">~ ${escapeHtml(line.before || '')} → ${escapeHtml(line.after || '')}</div>`;
        }
        return `<div class="${cls}">  ${escapeHtml(line.after || line.before || '')}</div>`;
      })
      .join('');
    return `<div class="ocr-diff" aria-label="Diff">${rows}</div>`;
  }
  if (diff.kind === 'table' && diff.table) {
    return `<div class="ocr-diff"><span class="ocr-diff--add">table headers/rows reconstructed</span></div>`;
  }
  if (diff.kind === 'choices' && Array.isArray(diff.choices)) {
    const rows = diff.choices
      .filter((c) => c.type !== 'equal')
      .map((c) => {
        const cls = diffToneClass(c.type);
        return `<div class="${cls}">[${c.index}] ${escapeHtml(c.before ?? '')} → ${escapeHtml(c.after ?? '')}</div>`;
      })
      .join('');
    return `<div class="ocr-diff">${rows || '<div class="ocr-diff--equal">choices unchanged</div>'}</div>`;
  }
  return '';
}

export default {
  renderQuestionBadge,
  mountReviewerButton,
  openReviewerPanel,
  closeReviewerPanel,
};
