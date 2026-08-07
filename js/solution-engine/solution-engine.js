/**
 * Sprint-15A+ — AI Dynamic Solution Engine (orchestrator)
 * Sprint-17A — Gemini Native Problem Solver hooks (Problem First).
 * Legacy Pattern-based generation remains available as fallback / Learning Engine inputs.
 *
 * Student-screen lazy generation + LocalStorage cache.
 * Never writes Question / Pattern / Statistics DB.
 * Never mutates Runtime / Resolver / Override / Reviewer / Recovery / Learning Engine formulas.
 */

import { generateExplanation, generateKeyTakeaway } from './explanation-generator.js';
import { generateCalculationProcess } from './calculation-engine.js';
import { diagnoseMistake } from './mistake-diagnosis.js';
import { analyzeMisconception } from './misconception-engine.js';
import { generateFormulas } from './formula-engine.js';
import { generateTutorAdvice } from './tutor-advice.js';
import { buildLearningPrescription } from './learning-prescription.js';
import { resolveNextProblems } from './next-problem-engine.js';
import {
  cacheKey,
  getCachedSolution,
  setCachedSolution,
  appendSolutionHistory,
  recordMistakeHit,
  persistDiagnosis,
  persistPrescription,
  buildMistakeHeatmap,
  loadMistakeProfile,
} from './cache.js';
import {
  enrichWithSmartTutor,
  mountSmartTutorResult,
} from '../smart-tutor/smart-tutor.js';
import {
  solveWithGemini,
  mergeGeminiIntoPack,
  applyGeminiToSmartPack,
} from '../gemini-solver/gemini-orchestrator.js';
import {
  generateProfessorExplanation,
  mergeProfessorIntoPack,
  applyProfessorToSmartPack,
  PROFESSOR_ENGINE_VERSION,
} from '../professor-explanation/professor-engine.js';
import { updateTextbookWithGemini } from '../personal-textbook/textbook-engine.js';

export const SOLUTION_ENGINE_VERSION = '15A+';
/** Sprint-15B Result layer (Smart Tutor) — additive, does not change pack formulas */
export const SMART_RESULT_VERSION = '15B';
/** Sprint-17A/17C Problem First Gemini layer */
export const GEMINI_RESULT_VERSION = '17C';
/** Sprint-17D Professor Explanation (manual trigger) */
export const PROFESSOR_RESULT_VERSION = PROFESSOR_ENGINE_VERSION;

/**
 * Lazy-generate full tutor pack for Result screen.
 * @param {{
 *   question: object,
 *   grade: object,
 *   pattern?: object|null,
 *   questions?: object[],
 *   force?: boolean,
 * }} input
 */
export function generateSolutionPack(input = {}) {
  const question = input.question || {};
  const grade = input.grade || {};
  const pattern = input.pattern || null;
  const questions = input.questions || [];
  const selected = grade.selected ?? grade.selectedAnswer ?? null;
  const key = cacheKey(question.questionId, selected, question.patternId || pattern?.patternId);

  if (!input.force) {
    const cached = getCachedSolution(key);
    if (cached?.pack) return { ...cached.pack, fromCache: true };
  }

  const result = {
    correctAnswer: Number(question.answer),
    selectedAnswer: selected == null ? null : Number(selected),
    isCorrect:
      grade.result === 'correct'
      || (selected != null && Number(selected) === Number(question.answer)),
    outcome:
      grade.result === 'correct'
      || (selected != null && Number(selected) === Number(question.answer))
        ? '정답'
        : '오답',
    patternId: question.patternId || pattern?.patternId || null,
    patternName: pattern?.name || question.patternId || '—',
  };

  const explanation = generateExplanation(question, pattern, grade);
  const calculation = generateCalculationProcess(question, pattern);
  const diagnosis = diagnoseMistake(question, grade, pattern);
  const misconception = analyzeMisconception(question, diagnosis, pattern);
  const formulas = generateFormulas(question, pattern);
  const keyTakeaway = generateKeyTakeaway(question, pattern);
  const tutor = generateTutorAdvice(question, pattern, diagnosis);
  const prescription = buildLearningPrescription(question, diagnosis, questions, pattern);
  const nextProblems = resolveNextProblems({
    count: 3,
    excludeQuestionId: question.questionId,
    questions,
  });

  const pack = {
    schemaVersion: 'v1',
    engineVersion: SOLUTION_ENGINE_VERSION,
    questionId: question.questionId || null,
    generatedAt: new Date().toISOString(),
    fromCache: false,
    result,
    explanation,
    calculation,
    diagnosis,
    misconception,
    formulas,
    keyTakeaway,
    tutor,
    prescription,
    nextProblems,
    reviewer: {
      promoteHook: true,
      autoPromote: false,
      status: 'STUDENT_ONLY',
      message: '공식 해설 승격은 Reviewer가 수동으로만 수행할 수 있습니다.',
    },
  };

  setCachedSolution(key, { pack, key });
  appendSolutionHistory({
    questionId: pack.questionId,
    patternId: pack.result.patternId,
    isCorrect: pack.result.isCorrect,
    primaryCode: diagnosis.primary?.code || null,
    confidence: diagnosis.confidence?.percent ?? null,
  });

  if (!pack.result.isCorrect && diagnosis.primary?.code && diagnosis.primary.code !== 'NONE') {
    recordMistakeHit({
      code: diagnosis.primary.code,
      label: diagnosis.primary.label,
      patternId: pack.result.patternId,
      questionId: pack.questionId,
    });
  }

  if (pack.questionId) {
    persistDiagnosis(pack.questionId, diagnosis);
    persistPrescription(pack.questionId, prescription);
  }

  return pack;
}

/**
 * Reviewer integration — UI button hook only. Never auto-promotes.
 * Does not write Override / Approved Solution / DB.
 * @param {object} pack
 * @returns {{ ok: boolean, action: string, requiresReviewer: boolean, payload: object }}
 */
export function requestPromoteToOfficial(pack) {
  return {
    ok: true,
    action: 'REQUEST_PROMOTE',
    requiresReviewer: true,
    autoPromote: false,
    payload: {
      questionId: pack?.questionId || null,
      generatedAt: pack?.generatedAt || null,
      engineVersion: pack?.engineVersion || SOLUTION_ENGINE_VERSION,
      note: 'Reviewer가 검토 후 수동 승격해야 합니다. 자동 승격 금지.',
    },
  };
}

/** Dashboard data export (heatmap-ready mistake profile). */
export function getDashboardMistakeData() {
  const profile = loadMistakeProfile();
  return {
    profile,
    heatmap: buildMistakeHeatmap(profile),
    totalWrong: profile.totalWrong || 0,
  };
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderMarkdownTable(md) {
  if (!md || !String(md).includes('|')) return '';
  const lines = String(md)
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return `<pre class="se-pre">${esc(md)}</pre>`;
  const rows = lines
    .filter((l) => !/^\|?\s*-/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim()),
    );
  if (!rows.length) return '';
  const head = rows[0];
  const body = rows.slice(1);
  return `<div class="se-table-wrap"><table class="se-table"><thead><tr>${head
    .map((h) => `<th>${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

/**
 * Accordion HTML for Result screen.
 * @param {object} pack
 * @param {{ showPromote?: boolean }} [options]
 */
export function renderSolutionAccordion(pack, options = {}) {
  if (!pack) {
    return `<p class="ll-hint">AI 풀이를 생성하지 못했습니다.</p>`;
  }

  const r = pack.result || {};
  const diag = pack.diagnosis || {};
  const candidates = (diag.candidates || [])
    .map((c) => {
      const mark = c.checked ? '■' : '□';
      return `<li class="se-diag-item${c.checked ? ' is-primary' : ''}"><span class="se-mark">${mark}</span> ${esc(c.label)}${
        c.checked ? ` <span class="se-conf">Confidence ${esc(c.confidence)}%</span>` : ''
      }</li>`;
    })
    .join('');

  const steps = (pack.explanation?.steps || [])
    .map(
      (s) => `
      <li class="se-step">
        <strong>${esc(s.title)}</strong>
        <p>${esc(s.body)}</p>
      </li>`,
    )
    .join('');

  const calc = (pack.calculation || [])
    .map(
      (sec) => `
      <div class="se-calc-block">
        <h4>${esc(sec.title)}</h4>
        <ol>${(sec.lines || []).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
        ${sec.markdownTable ? renderMarkdownTable(sec.markdownTable) : ''}
      </div>`,
    )
    .join('');

  const formulas = (pack.formulas || [])
    .map(
      (f) => `
      <li class="se-formula-item">
        <strong>${esc(f.name)}</strong>
        <code>${esc(f.formula)}</code>
        <small>언제: ${esc(f.when)}</small>
      </li>`,
    )
    .join('');

  const takeaway = (pack.keyTakeaway || [])
    .map((line) => `<li>${esc(line)}</li>`)
    .join('');

  const tutorChecks = (pack.tutor?.checklist || [])
    .map(
      (c) => `
      <li><label class="se-check"><input type="checkbox" disabled> ${esc(c.label)}</label></li>`,
    )
    .join('');

  const rx = (pack.prescription?.items || [])
    .filter((i) => i.type !== 'RECOMMENDATION' || i.questionId || i.patternId)
    .slice(0, 8)
    .map(
      (i) => `
      <li class="se-rx-item">
        <strong>추천</strong> ${esc(i.label)}${
          i.count > 1 ? ` ${esc(i.count)}문제` : ''
        }
        <small>${esc(i.reason || '')}</small>
      </li>`,
    )
    .join('');

  const next = (pack.nextProblems?.items || [])
    .map(
      (n) => `
      <li><a class="se-next-link" href="${esc(n.href)}">${esc(n.questionId || n.patternId || n.id)}</a>
        <small>#${esc(n.rank)} · Recommendation</small></li>`,
    )
    .join('');

  const promoteBtn =
    options.showPromote !== false
      ? `<div class="se-promote">
          <button type="button" class="button button--ghost button--sm" data-se-promote>
            공식 해설 승격
          </button>
          <p class="ll-hint">Reviewer 수동 승격만 가능 · 자동 승격 금지</p>
        </div>`
      : '';

  const sections = [
    {
      id: 'result',
      open: true,
      title: '① 결과',
      body: `
        <dl class="se-result-grid">
          <div><dt>정답</dt><dd>${esc(r.correctAnswer)}</dd></div>
          <div><dt>학생 답</dt><dd>${esc(r.selectedAnswer ?? '—')}</dd></div>
          <div><dt>정오</dt><dd class="${r.isCorrect ? 'is-ok' : 'is-bad'}">${esc(r.outcome)}</dd></div>
          <div><dt>Pattern</dt><dd>${esc(r.patternName)} <code>${esc(r.patternId || '')}</code></dd></div>
        </dl>`,
    },
    {
      id: 'ai-solution',
      open: true,
      title: '② AI 풀이',
      body: steps
        ? `<ol class="se-steps">${steps}</ol>`
        : '<p class="ll-hint">풀이 단계가 없습니다.</p>',
    },
    {
      id: 'calculation',
      open: false,
      title: '③ 계산 과정',
      body: calc || '<p class="ll-hint">계산 과정이 없습니다.</p>',
    },
    {
      id: 'diagnosis',
      open: !r.isCorrect,
      title: '④ 왜 틀렸는가',
      body: `
        <p class="se-summary">${esc(diag.summary || '')}</p>
        <ul class="se-diag-list">${candidates || '<li>—</li>'}</ul>
        ${
          diag.confidence
            ? `<p class="se-conf-line">종합 Confidence ${esc(diag.confidence.percent)}% (${esc(diag.confidence.level)})</p>`
            : ''
        }`,
    },
    {
      id: 'misconception',
      open: false,
      title: '⑤ 오개념 분석',
      body: `<ul class="se-lines">${(pack.misconception?.lines || [])
        .map((l) => `<li>${esc(l)}</li>`)
        .join('')}</ul>`,
    },
    {
      id: 'formulas',
      open: false,
      title: '⑥ 핵심 공식',
      body: formulas
        ? `<ul class="se-formula-list">${formulas}</ul>`
        : '<p class="ll-hint">—</p>',
    },
    {
      id: 'takeaway',
      open: false,
      title: '⑦ 이번 문제 핵심',
      body: takeaway
        ? `<ul class="se-takeaway">${takeaway}</ul>`
        : '<p class="ll-hint">—</p>',
    },
    {
      id: 'tutor',
      open: false,
      title: '⑧ AI Tutor',
      body: `
        <p>${esc(pack.tutor?.advice || '')}</p>
        <ul class="se-checklist">${tutorChecks}</ul>`,
    },
    {
      id: 'prescription',
      open: false,
      title: '⑨ Learning Prescription',
      body: `
        <p class="se-summary">${esc(pack.prescription?.summary || '')}</p>
        <ul class="se-rx-list">${rx || '<li>—</li>'}</ul>`,
    },
    {
      id: 'next',
      open: false,
      title: '⑩ Next Problem',
      body: next
        ? `<ul class="se-next-list">${next}</ul>`
        : '<p class="ll-hint">추천 문제가 아직 없습니다. Learning Engine Recommendation을 생성한 뒤 다시 확인하세요.</p>',
    },
  ];

  const accordion = sections
    .map(
      (s) => `
      <details class="se-acc" data-se-section="${esc(s.id)}" ${s.open ? 'open' : ''}>
        <summary>${esc(s.title)}</summary>
        <div class="se-acc__body">${s.body}</div>
      </details>`,
    )
    .join('');

  return `
    <div class="se-root" data-solution-engine="15A+" data-from-cache="${pack.fromCache ? '1' : '0'}">
      <div class="se-toolbar">
        <p class="edu-kicker">AI Tutor Layer · Dynamic Solution Engine</p>
        <div class="se-toolbar__actions">
          <button type="button" class="button button--ghost button--sm" data-se-expand-all>모두 펼치기</button>
          <button type="button" class="button button--ghost button--sm" data-se-collapse-all>모두 접기</button>
        </div>
      </div>
      ${accordion}
      ${promoteBtn}
    </div>`;
}

/**
 * Mount accordion into host and bind expand/collapse + promote hook.
 * @param {HTMLElement|null} host
 * @param {object} pack
 * @param {{ onPromoteRequest?: (req: object) => void, showPromote?: boolean }} [options]
 */
export function mountSolutionAccordion(host, pack, options = {}) {
  if (!host) return null;
  host.innerHTML = renderSolutionAccordion(pack, options);
  host.hidden = false;

  const root = host.querySelector('.se-root');
  root?.querySelector('[data-se-expand-all]')?.addEventListener('click', () => {
    root.querySelectorAll('details.se-acc').forEach((d) => {
      d.open = true;
    });
  });
  root?.querySelector('[data-se-collapse-all]')?.addEventListener('click', () => {
    root.querySelectorAll('details.se-acc').forEach((d) => {
      d.open = false;
    });
  });
  root?.querySelector('[data-se-promote]')?.addEventListener('click', () => {
    const req = requestPromoteToOfficial(pack);
    if (typeof options.onPromoteRequest === 'function') {
      options.onPromoteRequest(req);
    } else {
      console.info('[solution-engine] promote requested (manual Reviewer only)', req);
      const hint = root.querySelector('.se-promote .ll-hint');
      if (hint) {
        hint.textContent =
          '승격 요청이 기록되었습니다. Reviewer가 수동 검토해야 하며 자동 승격되지 않습니다.';
      }
    }
  });

  return root;
}

/**
 * Skeleton while Gemini / Professor pipeline runs (Lazy Loading).
 */
export function renderGeminiSkeleton() {
  return `
    <div class="se-root st-root gemini-skel" data-gemini-solver="${GEMINI_RESULT_VERSION}" data-professor-engine="${PROFESSOR_RESULT_VERSION}" aria-busy="true">
      <div class="se-toolbar">
        <p class="edu-kicker">AI 전문 강사 해설 · Responses Runtime</p>
      </div>
      <div class="se-acc__body">
        <p class="ll-hint">계산과정 → 이론 → 시험팁 → 암기법 순으로 생성합니다…</p>
        <p class="ll-hint" data-professor-stream-phase>준비 중</p>
        <pre class="ll-hint" data-professor-stream-text style="white-space:pre-wrap;max-height:12rem;overflow:auto"></pre>
        <div class="gemini-skel__bars" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>`;
}

/**
 * Cost-protected gate — Manual Trigger only (Sprint-17D).
 * Auto cache generation is forbidden until Quality 승인 후.
 */
export function renderProfessorManualGate(pack = {}) {
  const qid = pack.questionId || pack.result?.questionId || '';
  return `
    <div class="se-root st-root professor-gate" data-professor-engine="${PROFESSOR_RESULT_VERSION}" data-manual-trigger="1">
      <div class="se-toolbar">
        <p class="edu-kicker">Professor-Level AI 강사 · Manual Trigger</p>
      </div>
      <div class="se-acc__body">
        <p class="ll-hint">API 비용 보호를 위해 해설은 자동 생성되지 않습니다. 버튼을 누르면 이 문제만 강사 해설을 생성합니다.</p>
        <p class="ll-hint">문제 ID: <code>${String(qid).replace(/</g, '')}</code></p>
        <button type="button" class="button button--primary" data-professor-generate>
          AI 강사 해설 생성
        </button>
      </div>
    </div>`;
}

/**
 * Sprint-17D.1 — Missing API Key setup gate (no silent LOCAL fallback).
 */
export function renderProfessorSetupGate(result = {}) {
  const msg = result.message || 'Gemini API Key 설정이 필요합니다.';
  const href = result.settingsHref || 'settings.html#gemini-ai-config';
  return `
    <div class="se-root st-root professor-setup" data-professor-engine="${PROFESSOR_RESULT_VERSION}" data-require-setup="1">
      <div class="se-toolbar">
        <p class="edu-kicker">provider: LOCAL · Gemini 미연결</p>
      </div>
      <div class="se-acc__body">
        <p class="se-summary">${String(msg).replace(/</g, '')}</p>
        <p class="ll-hint">실제 Gemini 해설을 받으려면 Settings에서 API Key를 저장하고 연결 테스트를 통과하세요.</p>
        <div class="se-toolbar__actions">
          <a class="button button--primary" href="${href}">설정 이동</a>
          <button type="button" class="button button--ghost" data-professor-generate>
            다시 시도
          </button>
        </div>
      </div>
    </div>`;
}

function mountPromoteOptions(pack, options) {
  return {
    ...options,
    onPromoteRequest: (req) => {
      const base = requestPromoteToOfficial(pack);
      if (typeof options.onPromoteRequest === 'function') {
        options.onPromoteRequest({ ...base, ...req, autoPromote: false });
      }
    },
  };
}

/**
 * Lazy entry used by Result screen (requestAnimationFrame friendly).
 * Sprint-15B: mounts Smart Tutor Learning Loop Result (keeps 15A+ pack generation).
 * Sprint-17A: Gemini Problem First fills Accordion content; Learning Engine keeps reco.
 * Sprint-17D: Default = Manual Trigger only (no auto Gemini/Professor cache generation).
 *   options.manualProfessor === false → legacy auto Gemini (17C)
 *   options.autoProfessor === true → run Professor immediately (approved phase only)
 */
export function lazyGenerateAndMount(host, input, options = {}) {
  const useGemini = options.useGemini !== false;
  const manualProfessor = options.manualProfessor !== false && options.autoProfessor !== true;

  const runLegacy = () => {
    const pack = generateSolutionPack(input);
    const smart = enrichWithSmartTutor(pack, input);
    mountSmartTutorResult(host, smart, mountPromoteOptions(pack, options));
    return smart;
  };

  const runProfessorPipeline = async (force = false) => {
    if (host) {
      host.hidden = false;
      host.innerHTML = renderGeminiSkeleton();
    }
    const pack = generateSolutionPack(input);
    const streamTextEl = host?.querySelector('[data-professor-stream-text]');
    const streamPhaseEl = host?.querySelector('[data-professor-stream-phase]');
    let streamed = '';
    const onDelta = (delta) => {
      streamed += String(delta || '');
      if (streamTextEl) streamTextEl.textContent = streamed.slice(-1200);
      if (streamPhaseEl) {
        const phase =
          /memoryHack|암기/i.test(streamed)
            ? '암기법'
            : /examTip|시험/i.test(streamed)
              ? '시험팁'
              : /coreConcept|appliedTheory|이론|개념/i.test(streamed)
                ? '이론'
                : '계산과정';
        streamPhaseEl.textContent = `스트리밍 · ${phase}`;
      }
    };
    let professor = null;
    try {
      professor = await generateProfessorExplanation({
        question: input.question,
        grade: input.grade,
        pattern: input.pattern,
        force: Boolean(force || input.force),
        saveCache: true,
        fastMode: true,
        skipRegen: true,
        stream: true,
        onDelta,
        level: input.level || 'intermediate',
      });
    } catch (err) {
      console.warn('[professor-explanation] pipeline failed — trying Gemini 17C', err);
      try {
        professor = await solveWithGemini({
          question: input.question,
          grade: input.grade,
          pattern: input.pattern,
          force: Boolean(force || input.force),
        });
      } catch (err2) {
        console.warn('[gemini-solver] fallback failed', err2);
      }
    }

    /* Sprint-17D.1 — missing key: show setup gate, never silent LOCAL as Gemini */
    if (professor?.requireSetup || professor?.error === 'missing_api_key') {
      if (host) {
        host.innerHTML = renderProfessorSetupGate(professor);
        const retry = host.querySelector('[data-professor-generate]');
        retry?.addEventListener('click', () => {
          runProfessorPipeline(true).catch((err) => {
            console.warn('[professor-explanation] retry failed', err);
          });
        });
      }
      if (typeof options.onReady === 'function') options.onReady(professor);
      return professor;
    }

    if (professor && professor.ok === false && !professor.payload) {
      if (host) {
        host.innerHTML = renderProfessorSetupGate({
          ...professor,
          message: professor.message || 'Gemini 해설 생성에 실패했습니다.',
        });
        const retry = host.querySelector('[data-professor-generate]');
        retry?.addEventListener('click', () => {
          runProfessorPipeline(true).catch(() => {});
        });
      }
      if (typeof options.onReady === 'function') options.onReady(professor);
      return professor;
    }

    let merged = pack;
    let smart = enrichWithSmartTutor(pack, input);
    if (professor?.professorLevel && professor?.payload) {
      merged = mergeProfessorIntoPack(pack, professor);
      smart = enrichWithSmartTutor(merged, input);
      smart = applyProfessorToSmartPack(smart, professor);
    } else if (professor?.payload || professor?.explanation) {
      merged = mergeGeminiIntoPack(pack, professor);
      smart = enrichWithSmartTutor(merged, input);
      smart = applyGeminiToSmartPack(smart, professor);
    }

    if (professor?.payload) {
      try {
        smart.personalTextbook = updateTextbookWithGemini({
          question: input.question,
          pattern: input.pattern,
          grade: input.grade,
          pack: smart,
          gemini: professor,
        });
      } catch (_err) {
        /* non-critical */
      }
    }
    mountSmartTutorResult(host, smart, mountPromoteOptions(merged, options));
    if (typeof options.onReady === 'function') options.onReady(smart);
    return smart;
  };

  const mountManualGate = () => {
    const pack = generateSolutionPack(input);
    const smart = enrichWithSmartTutor(pack, input);
    if (host) {
      host.hidden = false;
      host.innerHTML = renderProfessorManualGate(smart);
      const btn = host.querySelector('[data-professor-generate]');
      btn?.addEventListener('click', () => {
        runProfessorPipeline(true).catch((err) => {
          console.warn('[professor-explanation] manual generate failed', err);
          try {
            runLegacy();
          } catch (_e) {
            /* ignore */
          }
        });
      });
    }
    if (typeof options.onReady === 'function') options.onReady({ ...smart, awaitingProfessor: true });
    return { deferred: true, gemini: false, professor: 'manual', pack: smart };
  };

  if (!useGemini) {
    if (typeof requestAnimationFrame === 'function' && options.defer !== false) {
      requestAnimationFrame(() => {
        const smart = runLegacy();
        if (typeof options.onReady === 'function') options.onReady(smart);
      });
      return { deferred: true, gemini: false };
    }
    return runLegacy();
  }

  /* Sprint-17D cost protection — Manual Trigger gate */
  if (manualProfessor) {
    if (typeof requestAnimationFrame === 'function' && options.defer !== false) {
      requestAnimationFrame(() => mountManualGate());
      return { deferred: true, professor: 'manual' };
    }
    return mountManualGate();
  }

  /* Approved auto path */
  const pending = runProfessorPipeline(false);
  if (typeof options.onReady !== 'function') {
    pending.catch((err) => {
      console.warn('[professor-explanation] background error', err);
      try {
        runLegacy();
      } catch (_e) {
        /* ignore */
      }
    });
  }
  return { deferred: true, gemini: true, professor: true, pending };
}

export default {
  SOLUTION_ENGINE_VERSION,
  SMART_RESULT_VERSION,
  GEMINI_RESULT_VERSION,
  PROFESSOR_RESULT_VERSION,
  generateSolutionPack,
  requestPromoteToOfficial,
  getDashboardMistakeData,
  renderSolutionAccordion,
  mountSolutionAccordion,
  lazyGenerateAndMount,
  renderGeminiSkeleton,
  renderProfessorManualGate,
  renderProfessorSetupGate,
};
