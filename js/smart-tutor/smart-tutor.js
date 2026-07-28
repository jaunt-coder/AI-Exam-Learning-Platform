/**
 * Sprint-15B — Smart Tutor (Advice + Result Orchestrator)
 * Result 화면에서 학습 루프를 완성한다.
 * Question / Pattern / Statistics DB · Runtime · Learning Engine 계산식 미변경.
 */

import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from '../ai-tutor-content/pattern-profiles.js';
import { getCalculationTemplate } from '../ai-tutor-content/calculation-templates.js';
import { generateTutorAdvice } from '../solution-engine/tutor-advice.js';
import { getOverride } from '../reviewer/override-service.js';
import { getApprovedSolution } from '../solution-overlay.js';
import { persistSmartTutorAdvice, appendPromoteRequest } from './cache.js';
import { buildSmartReviewBundle } from './smart-review.js';
import { buildFormulaCard, renderFormulaCardHtml } from './formula-card.js';
import { pickMiniRetry } from './mini-retry.js';
import { recordWeakMistake } from './weak-memory.js';
import { runAutoLearningLoop } from './learning-loop.js';
import {
  generateExamStrategy,
  enrichNextProblemsWithStrategy,
} from '../exam-strategy/strategy-engine.js';
import {
  getExamModeStrategy,
  enrichNextProblemsWithExamGoal,
} from '../exam-goal/exam-goal-engine.js';
import {
  evaluateSolutionQuality,
  renderStudentQualityCard,
} from '../solution-quality/solution-quality-engine.js';

export const SMART_TUTOR_VERSION = '15B';

/** Student-facing mistake types (Sprint-15B) */
export const MISTAKE_TYPES = Object.freeze([
  { code: 'CALC_MISTAKE', label: '① 계산 실수', order: 1 },
  { code: 'CONCEPT_MIXUP', label: '② 개념 착각', order: 2 },
  { code: 'INCOMPLETE_READ', label: '③ 문제를 끝까지 안 읽음', order: 3 },
  { code: 'PATTERN_CONFUSION', label: '④ Pattern 혼동', order: 4 },
  { code: 'TIME_PRESSURE', label: '⑤ 시간 부족', order: 5 },
]);

const DIAGNOSIS_TO_TYPE = {
  CALC_ERROR: 'CALC_MISTAKE',
  UNIT_ERROR: 'CALC_MISTAKE',
  AVG_COST_ERROR: 'CALC_MISTAKE',
  CONCEPT_GAP: 'CONCEPT_MIXUP',
  CONDITION_MISS: 'INCOMPLETE_READ',
  METHOD_SWAP: 'PATTERN_CONFUSION',
  FIFO_ERROR: 'PATTERN_CONFUSION',
  NONE: null,
};

export const PROMOTE_STAGES = Object.freeze([
  { id: 'AI', label: 'AI 해설' },
  { id: 'REVIEWER', label: 'Reviewer 승인' },
  { id: 'CANDIDATE', label: 'Candidate' },
  { id: 'ADMIN', label: '관리자 승인' },
  { id: 'OFFICIAL', label: 'Official Solution' },
]);

/**
 * Map 15A+ diagnosis → 15B mistake type with confidence.
 */
export function classifyMistakeType(diagnosis = {}, options = {}) {
  if (diagnosis?.isCorrect || diagnosis?.primary?.code === 'NONE') {
    return {
      isCorrect: true,
      primary: null,
      types: MISTAKE_TYPES.map((t) => ({ ...t, checked: false, confidence: 0 })),
      confidence: { percent: 100, level: 'HIGH' },
      summary: '정답 — 실수 유형 분류 불필요',
    };
  }

  const primaryCode = diagnosis?.primary?.code || '';
  const mapped = DIAGNOSIS_TO_TYPE[primaryCode] || 'CONCEPT_MIXUP';
  const baseConf = Number(
    diagnosis?.confidence?.percent ?? diagnosis?.primary?.confidence ?? 60,
  );
  const durationMs = options.durationMs;
  const boostTime =
    Number.isFinite(durationMs) && durationMs > 0 && durationMs < 25000;

  const scored = MISTAKE_TYPES.map((t) => {
    let confidence = 12;
    if (t.code === mapped) {
      confidence = Math.min(99, Math.max(baseConf, 55));
    } else if (boostTime && t.code === 'TIME_PRESSURE') {
      confidence = 48;
    } else if (
      diagnosis?.candidates?.some((c) => DIAGNOSIS_TO_TYPE[c.code] === t.code)
    ) {
      const hit = diagnosis.candidates.find(
        (c) => DIAGNOSIS_TO_TYPE[c.code] === t.code,
      );
      confidence = Math.min(80, Number(hit?.confidence) || 30);
    }
    return { ...t, checked: false, confidence };
  }).sort((a, b) => b.confidence - a.confidence);

  scored[0].checked = true;
  const primary = scored[0];

  return {
    isCorrect: false,
    primary,
    types: [...scored].sort((a, b) => a.order - b.order),
    confidence: diagnosis.confidence || {
      percent: primary.confidence,
      level:
        primary.confidence >= 75
          ? 'HIGH'
          : primary.confidence >= 50
            ? 'MID'
            : 'LOW',
    },
    summary: `실수 유형: ${primary.label} (Confidence ${primary.confidence}%)`,
  };
}

/**
 * Exam-hall checklist: 시험장에서 → 이렇게 푸세요
 */
export function buildExamHallTutor(
  question = {},
  pattern = null,
  diagnosis = null,
  reviewerHints = [],
) {
  const patternId = question.patternId || pattern?.patternId || '';
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const name = pattern?.name || PATTERN_NAMES[patternId] || patternId;
  const template = profile?.defaultTemplateId
    ? getCalculationTemplate(profile.defaultTemplateId)
    : null;
  const base = generateTutorAdvice(question, pattern, diagnosis);

  let steps = [];
  if (patternId === 'ACC_INV_006') {
    steps = [
      'FIFO 확인',
      '재고 흐름 작성',
      '기말재고 계산',
      '매출원가 계산',
      '보기 비교',
    ];
  } else if (patternId === 'ACC_INV_001') {
    steps = [
      '소유권 키워드 표시',
      'FOB·위탁·적송·시송 분류',
      '포함/제외 목록',
      '실사액 조정',
      '보기 비교',
    ];
  } else if (Array.isArray(profile?.solvingAlgorithm) && profile.solvingAlgorithm.length) {
    steps = profile.solvingAlgorithm.slice(0, 5).map((s) => String(s).slice(0, 36));
  } else if (Array.isArray(base.checklist) && base.checklist.length) {
    steps = base.checklist.map((c) => c.label);
  } else if (template?.steps?.length) {
    steps = template.steps.slice(0, 5).map((s) => String(s).slice(0, 36));
  } else {
    steps = ['조건 확인', 'Pattern 확정', '공식 적용', '계산', '보기 비교'];
  }

  const warnings = (reviewerHints || []).map((h) => ({
    title: h.title || '주의',
    message: h.message,
    source: h.source,
  }));

  if (
    patternId === 'ACC_INV_006'
    && !warnings.length
    && (profile?.wrongReasons?.avg || profile?.wrongReasons?.fifo)
  ) {
    warnings.push({
      title: '주의',
      message: '평균단가 문제가 아닙니다. FIFO입니다.',
      source: 'official-profile',
    });
  }

  const advice = {
    title: '시험장 체크리스트',
    headline: '시험장에서',
    subHeadline: '이렇게 푸세요',
    patternName: name,
    patternId,
    steps: steps.slice(0, 6).map((label, i) => ({
      order: i + 1,
      label: String(label).replace(/^\d+[\.\)]\s*/, ''),
    })),
    warnings,
    legacyAdvice: base.advice,
    source: 'smart-tutor',
  };

  if (question.questionId) {
    persistSmartTutorAdvice(question.questionId, advice);
  }

  return advice;
}

export function buildPromotePipeline(pack = null, existingRequest = null) {
  const hasRequest = Boolean(existingRequest || pack?.reviewer?.promoteRequested);
  return {
    autoPromote: false,
    stages: PROMOTE_STAGES.map((s, i) => {
      let status = 'locked';
      if (i === 0) status = 'done';
      else if (i === 1) status = hasRequest ? 'pending' : 'ready';
      else if (i === 2 && hasRequest) status = 'candidate';
      return { ...s, status, order: i + 1 };
    }),
    message: '자동 승격 금지 · Reviewer → Candidate → 관리자 승인 후 Official',
  };
}

export function requestPromoteCandidate(pack) {
  const entry = appendPromoteRequest({
    questionId: pack?.questionId || null,
    engineVersion: pack?.engineVersion || SMART_TUTOR_VERSION,
    stage: 'CANDIDATE',
    status: 'AWAITING_REVIEWER',
    autoPromote: false,
    note: 'AI 해설 → Reviewer 승인 → Candidate. Official은 관리자 승인 후에만.',
  });
  return {
    ok: true,
    action: 'REQUEST_PROMOTE_CANDIDATE',
    requiresReviewer: true,
    requiresAdmin: true,
    autoPromote: false,
    pipeline: buildPromotePipeline(pack, entry),
    payload: entry,
  };
}

function resolveReviewerNote(questionId) {
  if (!questionId) return null;
  try {
    const ov = getOverride(questionId);
    const note =
      ov?.override?.reviewerNote
      || ov?.override?.note
      || ov?.reviewerNote
      || '';
    return String(note).trim() || null;
  } catch (_err) {
    return null;
  }
}

function resolveApproved(questionId) {
  if (!questionId) return null;
  try {
    return getApprovedSolution(questionId) || null;
  } catch (_err) {
    return null;
  }
}

/**
 * Enrich 15A+ solution pack with Sprint-15B Smart Tutor layers.
 */
export function enrichWithSmartTutor(pack, input = {}) {
  const question = input.question || {};
  const pattern = input.pattern || null;
  const grade = input.grade || {};
  const questions = input.questions || [];
  const patterns = input.patterns || [];
  const durationMs = input.durationMs;

  const reviewerNote = resolveReviewerNote(question.questionId);
  const approvedSolution = resolveApproved(question.questionId);

  const smartReview = buildSmartReviewBundle({
    question,
    pattern,
    grade,
    pack,
    reviewerNote,
    approvedSolution,
  });

  const mistakeTypes = classifyMistakeType(pack?.diagnosis, { durationMs });
  const formulaCard = buildFormulaCard(question, pattern, pack?.formulas);
  const examTutor = buildExamHallTutor(
    question,
    pattern,
    pack?.diagnosis,
    smartReview.reviewerHints,
  );
  const miniRetry = pickMiniRetry({
    pattern,
    questionId: question.questionId,
    questions,
  });
  const promotePipeline = buildPromotePipeline(pack);

  if (
    !pack?.fromCache
    && !pack?.result?.isCorrect
    && pack?.diagnosis?.primary?.code
  ) {
    recordWeakMistake({
      code: pack.diagnosis.primary.code,
      label: pack.diagnosis.primary.label,
      patternId: pack.result?.patternId || question.patternId,
      questionId: question.questionId,
    });
  }

  const learningLoop = runAutoLearningLoop({
    question,
    pattern,
    questions,
    patterns,
    pack,
    alreadyRecorded: true,
  });

  let examStrategy = null;
  let examModeStrategy = null;
  let nextProblems = learningLoop?.nextProblems || pack?.nextProblems || null;
  try {
    examStrategy = generateExamStrategy({ questions, patterns });
    nextProblems = enrichNextProblemsWithStrategy(nextProblems, examStrategy);
  } catch (_err) {
    examStrategy = null;
  }
  try {
    examModeStrategy = getExamModeStrategy({ questions, patterns });
    nextProblems = enrichNextProblemsWithExamGoal(nextProblems, examModeStrategy);
  } catch (_err) {
    examModeStrategy = null;
  }

  let solutionQuality = null;
  try {
    solutionQuality = evaluateSolutionQuality({
      questionId: question.questionId || pack.questionId,
      resolvedQuestion: question,
      question,
      pack,
      solutionResult: pack,
      studentAnswer: grade?.selected ?? grade?.selectedAnswer ?? pack.result?.selectedAnswer,
      correctAnswer: question.answer ?? pack.result?.correctAnswer,
      patternId: question.patternId || pattern?.patternId,
      pattern,
    });
  } catch (_err) {
    solutionQuality = null;
  }

  return {
    ...pack,
    engineVersion: SMART_TUTOR_VERSION,
    smartTutorVersion: SMART_TUTOR_VERSION,
    smartReview,
    mistakeTypes,
    formulaCard,
    examTutor,
    miniRetry,
    promotePipeline,
    learningLoop,
    examStrategy,
    examModeStrategy,
    solutionQuality,
    examTutorContext: examModeStrategy
      ? {
          examGoal: examModeStrategy.goal,
          examPhase: {
            phase: examModeStrategy.phase,
            phaseId: examModeStrategy.phaseId,
            label: examModeStrategy.phaseLabel,
            daysRemaining: examModeStrategy.daysRemaining,
            dDay: examModeStrategy.dDay,
          },
          riskPatterns: examModeStrategy.riskPatterns,
          todayTasks: examModeStrategy.todayTasks,
        }
      : null,
    nextProblems,
    recommendationWhy: nextProblems?.strategyExplain || null,
    examPerspective: nextProblems?.examPerspective || null,
    reviewerFeedback: {
      note: reviewerNote,
      hints: smartReview.reviewerHints,
      includedInPrompt: Boolean(smartReview.reviewerHints?.length),
    },
  };
}

/**
 * Generate full Smart Tutor pack.
 * @param {object} input
 * @param {object} [basePack] — optional prebuilt solution pack (avoids circular import)
 * @param {(input: object) => object} [generateBase] — inject generateSolutionPack from caller
 */
export function generateSmartTutorPack(input = {}, basePack = null, generateBase = null) {
  const pack =
    basePack
    || (typeof generateBase === 'function' ? generateBase(input) : null);
  if (!pack) {
    throw new Error('[smart-tutor] base solution pack required (pass pack or generateBase)');
  }
  return enrichWithSmartTutor(pack, input);
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
 * Sprint-15B Result HTML — full learning loop in one screen.
 */
export function renderSmartTutorResult(pack, options = {}) {
  if (!pack) {
    return `<p class="ll-hint">AI 풀이를 생성하지 못했습니다.</p>`;
  }

  const r = pack.result || {};
  const smart = pack.smartReview?.explanation;
  const thirty = pack.smartReview?.thirtySecond;
  const diag = pack.diagnosis || {};
  const mistake = pack.mistakeTypes || {};
  const exam = pack.examTutor || {};
  const mini = pack.miniRetry || {};
  const pipeline = pack.promotePipeline || buildPromotePipeline(pack);

  const smartSections = (smart?.sections || [])
    .map(
      (s) => `
      <div class="st-expl-block">
        <h4>${esc(s.title)}</h4>
        ${
          s.lines?.length
            ? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
            : `<p>${esc(s.body)}</p>`
        }
      </div>`,
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

  const diagCandidates = (diag.candidates || [])
    .map((c) => {
      const mark = c.checked ? '■' : '□';
      return `<li class="se-diag-item${c.checked ? ' is-primary' : ''}"><span class="se-mark">${mark}</span> ${esc(c.label)}${
        c.checked ? ` <span class="se-conf">Confidence ${esc(c.confidence)}%</span>` : ''
      }</li>`;
    })
    .join('');

  const mistakeList = (mistake.types || [])
    .map((t) => {
      const mark = t.checked ? '■' : '□';
      return `<li class="st-mistake-item${t.checked ? ' is-primary' : ''}">
        <span class="se-mark">${mark}</span> ${esc(t.label)}
        <span class="se-conf">Confidence ${esc(t.confidence)}%</span>
      </li>`;
    })
    .join('');

  const thirtyHtml = thirty
    ? `
      <div class="st-review-card">
        <p class="st-review-card__headline">${esc(thirty.headline)}</p>
        <ul class="st-review-bullets">
          ${(thirty.bullets || [])
            .map((b) => `<li><span class="st-check">${esc(b.mark || '✔')}</span> ${esc(b.text)}</li>`)
            .join('')}
        </ul>
        <p class="st-review-timer"><span>${esc(thirty.label || '암기시간')}</span> <strong>${esc(thirty.seconds || 30)}초</strong></p>
      </div>`
    : '<p class="ll-hint">—</p>';

  const examSteps = (exam.steps || [])
    .map(
      (s) => `<li><span class="st-step-num">${esc(s.order)}</span> ${esc(s.label)}</li>`,
    )
    .join('');

  const examWarnings = (exam.warnings || [])
    .map(
      (w) => `
      <div class="st-tutor-warn">
        <p class="st-tutor-warn__kicker">${esc(w.title)}</p>
        <p>${esc(w.message)}</p>
      </div>`,
    )
    .join('');

  const miniHtml = mini.questionId
    ? `
      <p class="st-mini__label">같은 Pattern · 미니문제 1개</p>
      <a class="st-mini__link button button--secondary" href="${esc(mini.href)}">${esc(mini.questionId)}</a>
      ${mini.stemPreview ? `<p class="st-mini__preview">${esc(mini.stemPreview)}…</p>` : ''}
      <p class="ll-hint">${esc(mini.note || '')}</p>`
    : '<p class="ll-hint">같은 Pattern 유사 문항이 아직 없습니다.</p>';

  const next = (pack.nextProblems?.items || [])
    .map(
      (n) => `
      <li>
        <a class="se-next-link" href="${esc(n.href)}">${esc(n.questionId || n.patternId || n.id)}</a>
        <small>#${esc(n.rank)} · Recommendation</small>
        ${
          n.why
            ? `<div class="st-why-rec">
                <p class="st-why-rec__title">${esc(n.why.title || '왜 이 문제를 추천했는가?')}</p>
                <p>현재 약점: <strong>${esc(n.why.currentWeakness)}</strong></p>
                <p>이 문제 목적: ${esc(n.why.purpose)}</p>
                <p>예상 효과: ${esc(n.why.expectedEffect)}</p>
                ${
                  n.examPerspective?.message
                    ? `<div class="st-why-exam">
                        <p class="st-why-exam__title">${esc(n.examPerspective.title || '시험 전략 관점')}</p>
                        <p>${esc(n.examPerspective.message)}</p>
                      </div>`
                    : n.why.examPerspective
                      ? `<div class="st-why-exam"><p>${esc(n.why.examPerspective)}</p></div>`
                      : ''
                }
              </div>`
            : ''
        }
      </li>`,
    )
    .join('');

  const whyFallback = pack.recommendationWhy || pack.examPerspective
    ? `<div class="st-why-rec">
        ${
          pack.recommendationWhy
            ? `<p class="st-why-rec__title">${esc(pack.recommendationWhy.title || '왜 이 문제를 추천했는가?')}</p>
        <p>현재 약점: <strong>${esc(pack.recommendationWhy.currentWeakness)}</strong></p>
        <p>이 문제 목적: ${esc(pack.recommendationWhy.purpose)}</p>
        <p>예상 효과: ${esc(pack.recommendationWhy.expectedEffect)}</p>`
            : ''
        }
        ${
          pack.examPerspective?.message
            ? `<div class="st-why-exam">
                <p class="st-why-exam__title">${esc(pack.examPerspective.title || '시험 전략 관점')}</p>
                <p>${esc(pack.examPerspective.message)}</p>
              </div>`
            : ''
        }
      </div>`
    : '';

  const pipelineHtml = (pipeline.stages || [])
    .map(
      (s) => `
      <li class="st-promote-stage is-${esc(s.status)}">
        <span class="st-promote-stage__label">${esc(s.label)}</span>
        <span class="st-promote-stage__status">${esc(s.status)}</span>
      </li>`,
    )
    .join('');

  const promoteBtn =
    options.showPromote !== false
      ? `<div class="se-promote st-promote">
          <ol class="st-promote-pipeline">${pipelineHtml}</ol>
          <button type="button" class="button button--ghost button--sm" data-se-promote data-st-promote>
            Candidate 승격 요청
          </button>
          <p class="ll-hint">${esc(pipeline.message || '자동 승격 금지')}</p>
        </div>`
      : '';

  const loopOk = pack.learningLoop?.ok
    ? `<ul class="st-loop-status">
        <li>Learning Engine ${pack.learningLoop.learning?.refreshed ? '갱신' : '—'}</li>
        <li>Review Engine ${pack.learningLoop.review?.refreshed ? '갱신' : '—'}</li>
        <li>Recommendation ${pack.learningLoop.recommendation?.refreshed ? '갱신' : '—'}</li>
        <li>Dashboard ${pack.learningLoop.dashboard?.refreshed ? '갱신' : '—'}</li>
        <li>Evidence ${pack.learningLoop.evidence?.refreshed ? '갱신' : '—'}</li>
      </ul>`
    : '<p class="ll-hint">Learning Loop 스냅샷이 없습니다.</p>';

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
      title: pack.geminiNative ? '② AI 풀이 · Gemini' : '② AI 풀이',
      body: smartSections || '<p class="ll-hint">풀이가 없습니다.</p>',
    },
    {
      id: 'solution-quality',
      open: true,
      title: '②-1 AI 풀이 완성도',
      body: pack.solutionQuality
        ? renderStudentQualityCard(pack.solutionQuality)
        : pack.geminiNative?.quality
          ? `<p class="se-summary">Gemini Quality ${esc(pack.geminiNative.quality.score)}% · Missing ${esc(pack.geminiNative.quality.missingCount ?? 0)}</p>`
          : '<p class="ll-hint">완성도 평가가 없습니다.</p>',
    },
    {
      id: 'calculation',
      open: false,
      title: pack.geminiNative ? '③ Gemini 계산 과정' : '③ 계산 과정',
      body: calc || '<p class="ll-hint">계산 과정이 없습니다.</p>',
    },
    {
      id: 'diagnosis',
      open: !r.isCorrect,
      title: pack.geminiNative ? '④ 왜 틀렸는가 · Gemini' : '④ 왜 틀렸는가',
      body: `
        <p class="se-summary">${esc(diag.summary || '')}</p>
        <ul class="se-diag-list">${diagCandidates || '<li>—</li>'}</ul>
        ${
          diag.confidence
            ? `<p class="se-conf-line">종합 Confidence ${esc(diag.confidence.percent)}% (${esc(diag.confidence.level)})</p>`
            : ''
        }
        ${
          pack.geminiNative?.misconception?.summary
            ? `<p class="se-summary"><strong>오개념</strong> ${esc(pack.geminiNative.misconception.summary)}</p>`
            : ''
        }`,
    },
    {
      id: 'mistake-type',
      open: !r.isCorrect,
      title: pack.geminiNative ? '⑤ 오개념 · Gemini' : '⑤ 실수 유형',
      body: pack.geminiNative?.misconception?.summary
        ? `<p class="se-summary">${esc(pack.geminiNative.misconception.summary)}</p>
           <ul class="st-mistake-list">${mistakeList || ''}</ul>`
        : `
        <p class="se-summary">${esc(mistake.summary || '')}</p>
        <ul class="st-mistake-list">${mistakeList || '<li>—</li>'}</ul>`,
    },
    {
      id: 'thirty-review',
      open: true,
      title: pack.geminiNative ? '⑥ 30초 복습 · Gemini' : '⑥ 30초 복습',
      body: thirtyHtml,
    },
    {
      id: 'formula-card',
      open: true,
      title: pack.geminiNative ? '⑦ 공식 카드 · Gemini' : '⑦ 공식 카드',
      body: renderFormulaCardHtml(pack.formulaCard, esc),
    },
    {
      id: 'exam-tutor',
      open: true,
      title: pack.geminiNative ? '⑧ 시험장 체크리스트 · Gemini' : '⑧ 시험장 체크리스트',
      body: `
        <div class="st-exam-tutor">
          <p class="st-exam-tutor__flow">
            <strong>${esc(exam.headline || '시험장에서')}</strong>
            <span aria-hidden="true">↓</span>
            <strong>${esc(exam.subHeadline || '이렇게 푸세요')}</strong>
          </p>
          ${examWarnings}
          <ol class="st-exam-steps">${examSteps}</ol>
          ${
            pack.geminiNative?.tutor?.advice
              ? `<div class="st-tutor-warn"><p class="st-tutor-warn__kicker">AI 과외선생님</p><p>${esc(pack.geminiNative.tutor.advice)}</p></div>`
              : ''
          }
        </div>`,
    },
    {
      id: 'mini-retry',
      open: true,
      title: '⑨ 같은 Pattern 미니문제',
      body: `<div class="st-mini">${miniHtml}</div>`,
    },
    {
      id: 'next',
      open: true,
      title: '⑩ 다음 추천 문제',
      body: next
        ? `<ul class="se-next-list">${next}</ul>`
        : `${whyFallback || '<p class="ll-hint">추천 문제가 아직 없습니다.</p>'}`,
    },
    {
      id: 'learning-done',
      open: true,
      title: '⑪ 학습 완료',
      body: `
        <p class="st-done-msg">Result 화면에서 학습 루프가 갱신되었습니다.</p>
        ${loopOk}`,
    },
  ];

  const accordion = sections
    .map(
      (s) => `
      <details class="se-acc st-acc" data-se-section="${esc(s.id)}" data-st-section="${esc(s.id)}" ${s.open ? 'open' : ''}>
        <summary>${esc(s.title)}</summary>
        <div class="se-acc__body">${s.body}</div>
      </details>`,
    )
    .join('');

  return `
    <div class="se-root st-root" data-solution-engine="15A+" data-smart-tutor="${SMART_TUTOR_VERSION}" data-gemini-solver="${pack.geminiNative ? '17A' : ''}" data-from-cache="${pack.fromCache ? '1' : '0'}" data-result-source="${esc(pack.resultSource || pack.geminiNative?.source || 'smart-tutor')}">
      <div class="se-toolbar">
        <p class="edu-kicker">${
          pack.geminiNative
            ? `Gemini Native Problem Solver${pack.geminiMeta?.cacheHit ? ' · Cache Hit' : ''}`
            : 'AI Learning Loop · Smart Tutor'
        }</p>
        <div class="se-toolbar__actions">
          <button type="button" class="button button--ghost button--sm" data-se-expand-all>모두 펼치기</button>
          <button type="button" class="button button--ghost button--sm" data-se-collapse-all>모두 접기</button>
        </div>
      </div>
      ${accordion}
      ${promoteBtn}
    </div>`;
}

export function mountSmartTutorResult(host, pack, options = {}) {
  if (!host) return null;
  host.innerHTML = renderSmartTutorResult(pack, options);
  host.hidden = false;

  const root = host.querySelector('.st-root, .se-root');
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
  root?.querySelector('[data-st-promote], [data-se-promote]')?.addEventListener('click', () => {
    const req = requestPromoteCandidate(pack);
    if (typeof options.onPromoteRequest === 'function') {
      options.onPromoteRequest(req);
    } else {
      const hint = root.querySelector('.se-promote .ll-hint');
      if (hint) {
        hint.textContent =
          'Candidate 승격 요청이 기록되었습니다. Reviewer·관리자 승인 후에만 Official로 반영됩니다. 자동 승격 없음.';
      }
      const pipe = root.querySelector('.st-promote-pipeline');
      if (pipe && req.pipeline) {
        pack.promotePipeline = req.pipeline;
        pipe.innerHTML = (req.pipeline.stages || [])
          .map(
            (s) => `
            <li class="st-promote-stage is-${esc(s.status)}">
              <span class="st-promote-stage__label">${esc(s.label)}</span>
              <span class="st-promote-stage__status">${esc(s.status)}</span>
            </li>`,
          )
          .join('');
      }
    }
  });

  return root;
}

/**
 * Lazy entry for Result screens.
 * @param {HTMLElement|null} host
 * @param {object} input
 * @param {{
 *   defer?: boolean,
 *   onReady?: (pack: object) => void,
 *   onPromoteRequest?: (req: object) => void,
 *   showPromote?: boolean,
 *   generateBase?: (input: object) => object,
 *   basePack?: object,
 * }} [options]
 */
export function lazyGenerateAndMountSmartTutor(host, input, options = {}) {
  const run = () => {
    const pack = generateSmartTutorPack(input, options.basePack || null, options.generateBase || null);
    mountSmartTutorResult(host, pack, options);
    if (typeof options.onReady === 'function') options.onReady(pack);
    return pack;
  };
  if (typeof requestAnimationFrame === 'function' && options.defer !== false) {
    requestAnimationFrame(() => {
      run();
    });
    return { deferred: true };
  }
  return run();
}

export default {
  SMART_TUTOR_VERSION,
  MISTAKE_TYPES,
  PROMOTE_STAGES,
  classifyMistakeType,
  buildExamHallTutor,
  buildPromotePipeline,
  requestPromoteCandidate,
  enrichWithSmartTutor,
  generateSmartTutorPack,
  renderSmartTutorResult,
  mountSmartTutorResult,
  lazyGenerateAndMountSmartTutor,
};
