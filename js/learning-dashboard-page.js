/**
 * Sprint-10E — Learning Dashboard page controller (UI only).
 * Sprint-14B — Student Learning Dashboard widgets (Learning Engine consume only).
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { loadDashboard } from './dashboard-service.js';
import { loadPhase1Database } from './data-loader.js';
import { enrichDashboardWithResolved } from './student/student-workspace.js';
import { buildLearningDashboard } from './learning-engine/learning-engine.js';
import { buildCoachDashboard } from './coach/ai-coach-service.js';
import { buildPatternTutorDashboardCard } from './coach/pattern-tutor.js';
import { buildQuestionTutorDashboardCard } from './coach/question-tutor.js';
import { buildReviewerDashboardCard } from './reviewer/review-service.js';
import { buildRecoveryDashboardCard } from './recovery/ai-recovery-service.js';
import { buildStudentDashboardView } from './dashboard/dashboard-engine.js';
import { mountWidgets, showSkeletons, widgetCount } from './dashboard/dashboard-widget.js';
import { renderTodayStudyCards, mountAnimatedBars } from './components/dashboard/progress.js';
import { renderMasterySummary } from './components/dashboard/mastery.js';
import { renderWeakPattern } from './components/dashboard/weak-pattern.js';
import { renderRecommendationList } from './components/dashboard/recommendation.js';
import { renderReviewBoard } from './components/dashboard/review.js';
import { renderHeatmap } from './components/dashboard/heatmap.js';
import { renderRecentGrowth, renderWeeklyStats } from './components/dashboard/chart.js';
import { renderRecentActivity } from './components/dashboard/recent-activity.js';
import { renderQuickStart } from './components/dashboard/quick-start.js';
import { attachEvidenceToRecommendations } from './evidence/evidence-engine.js';
import { generateExamStrategy } from './exam-strategy/strategy-engine.js';
import {
  buildExamGoalDashboard,
  saveExamGoal,
  setTaskCompleted,
  getExamGoal,
} from './exam-goal/exam-goal-engine.js';
import {
  renderMasteryMap,
  renderDangerPatterns,
  renderDailyPlanCard,
  renderReadinessCard,
  renderStrategyCard,
  renderPatternRiskList,
} from './components/dashboard/exam-strategy.js';
import {
  renderExamModeCard,
  renderExamCountdown,
  renderGoalProgress,
  renderTodayMission,
  renderRiskAlert,
  renderCompletionStreak,
  renderExamGoalForm,
} from './components/dashboard/exam-goal.js';
import {
  getDashboardSolutionQuality,
  renderDashboardQualityCard,
} from './solution-quality/solution-quality-engine.js';
import { getGeminiDashboardStats } from './gemini-solver/gemini-orchestrator.js';
import { getProfessorDashboardStats } from './professor-explanation/professor-engine.js';
import { getVisionDashboardStats, prewarmVisionCache } from './gemini-vision/vision-recovery.js';
import { getAiConnectionStatus } from './llm/ai-config.js';
import { getAiRuntimeDashboardStats } from './llm/runtime/responses-runtime.js';
import { getTextbookDashboardCard } from './personal-textbook/textbook-engine.js';
import {
  getFinalBookDashboardCard,
  maybeAutoCreateFinalBook,
} from './final-revision/final-book-engine.js';
import {
  ensureBuiltinSubjectsRegistered,
  getCurrentSubjectId,
  switchSubject,
  SUBJECT_LABELS,
} from './subject/subject-adapter.js';
import { getImportDashboardCard } from './import-engine/import-engine.js';
import { updateImportProgress } from './import-engine/import-storage.js';
import {
  buildPatternIntelligence,
  getPass60DashboardCard,
  getRoiDashboardCard,
} from './pattern-map/pattern-map-engine.js';

const INTEGRITY_REPORT_URL = 'data/question-integrity-report.json';

function syncSubjectSwitchUI() {
  const nav = document.getElementById('subject-switch');
  if (!nav) return;
  const current = getCurrentSubjectId();
  nav.querySelectorAll('[data-subject]').forEach((btn) => {
    const id = btn.getAttribute('data-subject');
    const pressed = id === current;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    btn.classList.toggle('is-active', pressed);
  });
}

function mountSubjectSwitch(onChanged) {
  ensureBuiltinSubjectsRegistered();
  const nav = document.getElementById('subject-switch');
  if (!nav) return;
  syncSubjectSwitchUI();
  nav.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-subject]');
    if (!btn) return;
    const id = btn.getAttribute('data-subject');
    if (!id || id === getCurrentSubjectId()) return;
    const result = await switchSubject(id);
    if (!result.ok) return;
    syncSubjectSwitchUI();
    const status = document.getElementById('dashboard-status');
    if (status) {
      status.textContent = `과목 전환: ${SUBJECT_LABELS[id] || id}`;
    }
    if (typeof onChanged === 'function') onChanged(result);
  });
}

function renderPersonalTextbookCard(card = {}) {
  const rows = [
    ['총 페이지', card.pageCount ?? 0],
    ['저장 문제', card.savedQuestions ?? 0],
    ['즐겨찾기', card.bookmarks ?? 0],
    ['AI Summary', card.aiSummary ?? 0],
    ['Weak Pattern', card.weakPattern ?? '—'],
    ['최근 업데이트', card.lastUpdated ?? '—'],
  ];
  return `
    <div class="ld-textbook-stats" data-personal-textbook="18A">
      <ul class="ld-stat-list">
        ${rows.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>
      <p class="ld-card-desc"><a href="textbook.html">AI 해설집 열기</a></p>
    </div>`;
}

function renderFinalRevisionCard(card = {}) {
  const rows = [
    ['생성일', card.createdAt ?? '—'],
    ['페이지', card.pageCount ?? 0],
    ['Weak Pattern', card.weakPattern ?? '—'],
    ['Weak Formula', card.weakFormula ?? '—'],
    ['마지막 업데이트', card.lastUpdated ?? '—'],
  ];
  return `
    <div class="ld-final-stats" data-final-revision="18A">
      <ul class="ld-stat-list">
        ${rows.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>
      <p class="ld-card-desc"><a href="textbook.html#fb-heading">Final Revision Book</a></p>
    </div>`;
}

function renderImportProgressCard(card = {}) {
  const rows = [
    ['총 PDF', card.totalPdf ?? 0],
    ['완료', card.completed ?? 0],
    ['실패', card.failed ?? 0],
    ['OCR Quality', card.ocrQuality ?? 0],
    ['Question Count', card.questionCount ?? 0],
    ['Subject Count', card.subjectCount ?? 0],
  ];
  return `
    <div class="ld-import-stats" data-import-progress="19B">
      <ul class="ld-stat-list">
        ${rows.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>
      <p class="ld-card-desc">Universal Import Engine · subjects/*/question-db.json (candidate)</p>
    </div>`;
}

function renderPass60Card(card = {}) {
  const rows = [
    ['전체 Pattern', card.totalPatterns ?? 0],
    ['합격 핵심', card.corePatterns ?? 0],
    ['현재 Master', card.masteredCore ?? 0],
    ['남은 Pattern', card.remainingPatterns ?? 0],
    ['예상 점수', card.expectedScore ?? 0],
  ];
  return `
    <div class="ld-pass60-stats" data-pass60="19C">
      <ul class="ld-stat-list">
        ${rows.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>
      <p class="ld-card-desc">${card.advice || ''}</p>
      <p class="ld-card-desc"><a href="pattern-intelligence.html">Pattern Intelligence</a></p>
    </div>`;
}

function renderRoiGaugeCard(card = {}) {
  const rows = [
    ['TOP Pattern', card.topPattern ?? '—'],
    ['ROI', card.topRoi ?? 0],
    ['Study Time', `${card.studyTime ?? 0}분`],
    ['Expected Gain', `+${card.expectedGain ?? 0}`],
  ];
  return `
    <div class="ld-roi-stats" data-roi-gauge="19C">
      <ul class="ld-stat-list">
        ${rows.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>
    </div>`;
}

function renderExpectedScoreCard(card = {}) {
  return `
    <div class="ld-expected-score" data-expected-score="19C">
      <p class="ld-metric-xl"><strong>${card.expectedScore ?? 0}</strong><span>점</span></p>
      <p class="ld-card-desc">Pass60 예상 점수</p>
    </div>`;
}

function renderRemainingPatternCard(card = {}) {
  return `
    <div class="ld-remaining-pattern" data-remaining-pattern="19C">
      <p class="ld-metric-xl"><strong>${card.remainingPatterns ?? 0}</strong><span>개</span></p>
      <p class="ld-card-desc">먼저 끝내야 할 Pattern</p>
    </div>`;
}

function renderGeminiSolverCard(stats = {}) {
  const rows = [
    ['Cache Hit', stats.cacheHit ?? 0],
    ['Cache Miss', stats.cacheMiss ?? 0],
    ['Avg Generation Time (ms)', stats.averageGenerationTime ?? 0],
    ['Avg Confidence', stats.averageConfidence ?? 0],
    ['Avg Quality', stats.averageQuality ?? 0],
    ['Missing Count', stats.missingCount ?? 0],
    ['Avg Explanation Length', stats.averageExplanationLength ?? 0],
    ['Avg Calculation Steps', stats.averageCalculationSteps ?? 0],
    ['Thinking Order Included %', `${stats.thinkingOrderIncludedPct ?? 0}%`],
    ['Why Others Wrong %', `${stats.whyOthersWrongPct ?? 0}%`],
  ];
  return `
    <div class="ld-gemini-stats" data-gemini-dashboard="17C">
      <ul class="ld-stat-list">
        ${rows
          .map(
            ([label, value]) =>
              `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`,
          )
          .join('')}
      </ul>
      <p class="ld-card-desc">Human-Level · model ${escapeHtml(stats.modelVersion || '—')} · prompt ${escapeHtml(stats.promptVersion || '—')}</p>
    </div>`;
}

function renderAiRuntimeCard(stats = {}) {
  const rows = [
    ['Provider', stats.provider || '—'],
    ['Current Model', stats.currentModel || '—'],
    ['Responses API', stats.responsesApi ? 'yes' : 'no'],
    ['Latency', `${stats.latency ?? 0}ms`],
    ['Average Time', `${stats.averageTime ?? 0}ms`],
    ['Tokens', stats.tokens ?? 0],
    ['Estimated Cost', stats.estimatedCost ?? 0],
    ['Cache Hit', stats.cacheHit ?? 0],
    ['Cache Miss', stats.cacheMiss ?? 0],
    ['Streaming', stats.streaming ? 'yes' : 'no'],
    ['Health', stats.health || '—'],
  ];
  return `
    <div class="ld-ai-runtime" data-ai-runtime="17E">
      <ul class="ld-stat-list">
        ${rows
          .map(
            ([label, value]) =>
              `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`,
          )
          .join('')}
      </ul>
      <p class="ld-card-desc">runtime ${escapeHtml(stats.runtimeVersion || '—')} · mode ${escapeHtml(stats.apiMode || '—')}</p>
    </div>`;
}

function renderAiStatusCard(stats = {}) {
  const rows = [
    ['Provider', stats.provider || '—'],
    ['Model', stats.model || '—'],
    ['Connected', stats.connected ? 'yes' : 'no'],
    ['Last API', stats.lastApi || stats.lastApiAt || stats.lastConnectedAt || '—'],
    ['Cache Hit', stats.cacheHit ?? 0],
    ['Cache Miss', stats.cacheMiss ?? 0],
    ['API Version', stats.apiVersion || '—'],
    ['Fallback', stats.fallbackModel || '—'],
  ];
  return `
    <div class="ld-ai-status" data-ai-status="17D.3">
      <ul class="ld-stat-list">
        ${rows
          .map(
            ([label, value]) =>
              `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`,
          )
          .join('')}
      </ul>
      <p class="ld-card-desc">providerVersion ${escapeHtml(stats.providerVersion || '—')}</p>
    </div>`;
}

function renderProfessorQualityCard(stats = {}) {
  const low = (stats.lowQualityTop10 || [])
    .slice(0, 10)
    .map(
      (r) =>
        `<li><code>${escapeHtml(r.questionId)}</code> <strong>${escapeHtml(r.score ?? '—')}</strong></li>`,
    )
    .join('');
  const regen = (stats.topRegenerated || [])
    .slice(0, 10)
    .map(
      (r) =>
        `<li><code>${escapeHtml(r.questionId)}</code> <strong>×${escapeHtml(r.regenCount ?? 0)}</strong></li>`,
    )
    .join('');
  return `
    <div class="ld-professor-stats" data-professor-dashboard="17D">
      <ul class="ld-stat-list">
        <li><span>평균 Quality Score</span><strong>${escapeHtml(stats.averageQuality ?? 0)}</strong></li>
        <li><span>Cache Hit</span><strong>${escapeHtml(stats.cacheHit ?? 0)}</strong></li>
        <li><span>Cache Miss</span><strong>${escapeHtml(stats.cacheMiss ?? 0)}</strong></li>
        <li><span>생성 횟수</span><strong>${escapeHtml(stats.generations ?? 0)}</strong></li>
        <li><span>재생성 횟수</span><strong>${escapeHtml(stats.regenerations ?? 0)}</strong></li>
      </ul>
      <div class="ld-prof-cols">
        <div>
          <p class="ld-card-desc">낮은 품질 TOP10</p>
          <ul class="ld-stat-list">${low || '<li>—</li>'}</ul>
        </div>
        <div>
          <p class="ld-card-desc">가장 많이 재생성된 문제</p>
          <ul class="ld-stat-list">${regen || '<li>—</li>'}</ul>
        </div>
      </div>
      <p class="ld-card-desc">Professor · model ${escapeHtml(stats.modelVersion || '—')} · prompt ${escapeHtml(stats.promptVersion || '—')}</p>
    </div>`;
}

function renderVisionOcrCard(stats = {}) {
  const rows = [
    ['Vision Cache Hit', stats.visionCacheHit ?? 0],
    ['Vision Cache Miss', stats.visionCacheMiss ?? 0],
    ['Vision Recovery %', `${stats.visionRecoveryPct ?? 0}%`],
    ['OCR Quality Average', stats.ocrQualityAverage ?? 0],
    ['Vision Quality Average', stats.visionQualityAverage ?? 0],
    ['Vision Calls', stats.visionCalls ?? 0],
    ['API Saved', stats.apiSaved ?? 0],
    ['이번 달 절감 호출', stats.monthApiSaved ?? 0],
    ['예상 비용 절감 (USD)', stats.estimatedCostSavedUsd ?? 0],
    ['이번 달 예상 절감 (USD)', stats.monthEstimatedCostSavedUsd ?? 0],
    ['Table Recovery %', `${stats.tableRecoveryPct ?? 0}%`],
    ['Formula Recovery %', `${stats.formulaRecoveryPct ?? 0}%`],
  ];
  return `
    <div class="ld-vision-stats" data-vision-dashboard="17B">
      <ul class="ld-stat-list">
        ${rows
          .map(
            ([label, value]) =>
              `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>`,
          )
          .join('')}
      </ul>
      <p class="ld-card-desc">threshold ${escapeHtml(stats.ocrThreshold ?? 70)} · model ${escapeHtml(stats.visionModel || '—')} · prompt ${escapeHtml(stats.promptVersion || '—')}</p>
    </div>`;
}

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCountList(container, counts, labels) {
  if (!container) return;
  const rows = labels
    .map(([key, label]) => {
      const n = Number(counts?.[key]) || 0;
      return `<li><span class="ld-key">${escapeHtml(label)}</span><strong class="ld-val">${n}</strong></li>`;
    })
    .join('');
  container.innerHTML = `<ul class="ld-count-list">${rows}</ul>`;
}

function renderTodayStudy(card, today) {
  if (!card) return;
  const active = today?.activeSession ? 'ACTIVE' : '없음';
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Active Session</dt><dd>${escapeHtml(active)}</dd></div>
      <div><dt>Strategy Type</dt><dd>${escapeHtml(today?.strategyType || '—')}</dd></div>
      <div><dt>Completed</dt><dd>${Number(today?.completedQuestions) || 0}</dd></div>
      <div><dt>Remaining</dt><dd>${Number(today?.remainingQuestions) || 0}</dd></div>
      <div><dt>Estimated Minutes</dt><dd>${Number(today?.estimatedMinutes) || 0}분</dd></div>
    </dl>
  `;
}

function renderPlans(card, plans) {
  if (!card) return;
  if (!plans?.length) {
    card.innerHTML = '<p class="ld-empty">Active Plan이 없습니다.</p>';
    return;
  }
  const rows = plans
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.patternId || '—')}</td>
        <td>${escapeHtml(p.actionType || '—')}</td>
        <td>${escapeHtml(p.priority)}</td>
        <td>${escapeHtml(p.attemptCount)}</td>
      </tr>`,
    )
    .join('');
  card.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table">
        <thead>
          <tr><th>Pattern</th><th>Action</th><th>Priority</th><th>Attempts</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderStrategies(card, strategies) {
  if (!card) return;
  if (!strategies?.length) {
    card.innerHTML = '<p class="ld-empty">Strategy가 없습니다.</p>';
    return;
  }
  const rows = strategies
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.patternId || '—')}</td>
        <td>${escapeHtml(s.strategyType || '—')}</td>
        <td>${escapeHtml(s.status || 'READY')}</td>
      </tr>`,
    )
    .join('');
  card.innerHTML = `
    <div class="ld-table-wrap">
      <table class="ld-table">
        <thead>
          <tr><th>Pattern</th><th>Strategy Type</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderRecommendation(card, summary) {
  if (!card) return;
  if (!summary || !summary.active) {
    card.innerHTML = '<p class="ld-empty">오늘 Recommendation이 없습니다.</p>';
    return;
  }
  const top = summary.highestPriority;
  const studentResolved = window.__studentResolvedRecommendation || null;
  const resolvedPreview = studentResolved?.questions?.length
    ? `<p class="ld-card-desc" style="margin-top:0.5rem">추천 문항(Resolved): ${studentResolved.questions
        .map((q) => `${q.questionId}`)
        .join(', ')}</p>`
    : '';
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Active</dt><dd>${Number(summary.active) || 0}</dd></div>
      <div><dt>Total</dt><dd>${Number(summary.total) || 0}</dd></div>
      <div><dt>Estimated Minutes</dt><dd>${Number(summary.estimatedMinutes) || 0}분</dd></div>
      <div><dt>Highest Priority</dt><dd>${escapeHtml(top?.reasonCode || '—')} · ${escapeHtml(top?.patternId || '')}</dd></div>
    </dl>
    <p class="ld-card-desc" style="margin-top:0.75rem">${escapeHtml(top?.reason || '')}</p>
    ${resolvedPreview}
  `;
}

function renderSession(card, studySession) {
  if (!card) return;
  const progress = studySession?.progress;
  if (!progress || !progress.total) {
    card.innerHTML = '<p class="ld-empty">오늘 Study Session이 없습니다.</p>';
    return;
  }
  const pct = progress.percent || 0;
  const resolvedSession = window.__studentResolvedSession || [];
  const sessionPreview = resolvedSession.length
    ? `<p class="ld-card-desc" style="margin-top:0.6rem">남은 문항(Resolved): ${resolvedSession
        .map((q) => q.questionId)
        .join(', ')}</p>`
    : '';
  card.innerHTML = `
    <div class="ld-progress-block">
      <p class="ld-progress-label"><strong>${escapeHtml(progress.label)}</strong> · ${pct}%</p>
      <div class="ld-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="세션 진행률">
        <span style="width:${pct}%"></span>
      </div>
      <dl class="ld-dl">
        <div><dt>남은 문제</dt><dd>${progress.remaining}</dd></div>
        <div><dt>예상 남은 시간</dt><dd>${progress.estimatedMinutesRemaining}분</dd></div>
        <div><dt>Strategy</dt><dd>${escapeHtml(progress.strategyType || '—')}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(progress.status || '—')}</dd></div>
      </dl>
    </div>
    ${sessionPreview}
  `;
}

function renderCoachCard(card, coachResult) {
  if (!card) return;
  if (!coachResult?.text) {
    card.innerHTML = '<p class="ld-empty">Coach 메시지를 준비하지 못했습니다.</p>';
    return;
  }
  const source = coachResult.fallback
    ? 'Rule Coach (fallback)'
    : coachResult.source === 'cache'
      ? 'Cache'
      : 'LLM Adapter';
  card.innerHTML = `
    <p class="ld-card-desc">${escapeHtml(source)}</p>
    <p class="ld-coach-text">${escapeHtml(coachResult.text)}</p>
  `;
}

function renderListBlock(title, items) {
  const list = Array.isArray(items) ? items : items ? [items] : [];
  if (!list.length) {
    return `<div><dt>${escapeHtml(title)}</dt><dd>—</dd></div>`;
  }
  const lis = list.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `
    <div class="ld-tutor-block">
      <h4>${escapeHtml(title)}</h4>
      <ul class="ld-tutor-list">${lis}</ul>
    </div>`;
}

function renderPatternTutorCard(card, tutor) {
  if (!card) return;
  if (!tutor) {
    card.innerHTML = '<p class="ld-empty">Pattern Tutor를 준비하지 못했습니다.</p>';
    return;
  }
  const source = tutor.fallback
    ? 'Rule Coach (fallback)'
    : 'LLM Adapter · Pattern Tutor';
  card.innerHTML = `
    <p class="ld-card-desc">${escapeHtml(source)} · ${escapeHtml(tutor.provider || 'openai')} / ${escapeHtml(tutor.model || 'gpt-5.5')}</p>
    <dl class="ld-dl">
      <div><dt>Pattern</dt><dd>${escapeHtml(tutor.patternId || '—')}</dd></div>
      <div><dt>Mastery</dt><dd>${escapeHtml(tutor.masteryLevel || '—')}</dd></div>
      <div><dt>Weakness</dt><dd>${escapeHtml(tutor.weaknessType || '—')}</dd></div>
      <div><dt>Confidence</dt><dd>${escapeHtml(tutor.confidence ?? '—')}</dd></div>
    </dl>
    <div class="ld-tutor-block">
      <h4>Explanation</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.explanation || tutor.summary || '')}</p>
    </div>
    <div class="ld-tutor-block">
      <h4>Why Wrong</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.whyWrong || '')}</p>
    </div>
    ${renderListBlock('Common Mistakes', tutor.commonMistakes)}
    ${renderListBlock('Review Checklist', tutor.reviewChecklist)}
    <div class="ld-tutor-block">
      <h4>Next Study</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.nextStudy || '')}</p>
    </div>
  `;
}

function renderQuestionTutorCard(card, tutor) {
  if (!card) return;
  if (!tutor) {
    card.innerHTML = '<p class="ld-empty">Question Tutor를 준비하지 못했습니다.</p>';
    return;
  }
  const source =
    tutor.source === 'pattern_tutor'
      ? 'Pattern Tutor (fallback)'
      : tutor.fallback
        ? 'Rule Coach (fallback)'
        : 'LLM Adapter · Question Tutor';
  card.innerHTML = `
    <p class="ld-card-desc">${escapeHtml(source)} · ${escapeHtml(tutor.provider || 'openai')} / ${escapeHtml(tutor.model || 'gpt-5.5')}</p>
    <dl class="ld-dl">
      <div><dt>Question</dt><dd>${escapeHtml(tutor.questionId || '—')}</dd></div>
      <div><dt>Pattern</dt><dd>${escapeHtml(tutor.patternId || '—')}</dd></div>
      <div><dt>Mistake Type</dt><dd>${escapeHtml(tutor.mistakeType || '—')}</dd></div>
      <div><dt>Confidence</dt><dd>${escapeHtml(tutor.confidence ?? '—')}</dd></div>
    </dl>
    <div class="ld-tutor-block">
      <h4>왜 틀렸는가</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.whyWrong || tutor.summary || '')}</p>
    </div>
    ${renderListBlock('Step by Step', tutor.stepByStep)}
    <div class="ld-tutor-block">
      <h4>핵심 개념</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.keyConcept || '')}</p>
    </div>
    <div class="ld-tutor-block">
      <h4>같은 함정</h4>
      <p class="ld-coach-text">${escapeHtml(tutor.similarTrap || '')}</p>
    </div>
    ${renderListBlock('복습 체크리스트', tutor.reviewChecklist)}
  `;
}

async function loadIntegrityReport() {
  try {
    const res = await fetch(INTEGRITY_REPORT_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (_err) {
    return null;
  }
}

function renderIntegrityCard(card, report) {
  if (!card) return;
  if (!report) {
    card.innerHTML =
      '<p class="ld-empty">Integrity Report를 불러오지 못했습니다.</p>';
    return;
  }
  const mismatch = Number(report.mismatchCount) || 0;
  const high = Array.isArray(report.highRiskQuestions)
    ? report.highRiskQuestions
    : [];
  const review = Array.isArray(report.reviewRequired)
    ? report.reviewRequired
    : [];
  const highIds = high
    .slice(0, 8)
    .map((v) => escapeHtml(v.questionId))
    .join(', ');
  const reviewIds = review
    .slice(0, 8)
    .map((v) => escapeHtml(v.questionId))
    .join(', ');

  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>분류 오류 개수</dt><dd>${mismatch}</dd></div>
      <div><dt>Human Review 필요</dt><dd>${review.length}</dd></div>
      <div><dt>High Confidence mismatch</dt><dd>${high.length}</dd></div>
      <div><dt>Checked</dt><dd>${Number(report.totalChecked) || 0}</dd></div>
    </dl>
    <div class="ld-tutor-block">
      <h4>High Confidence mismatch</h4>
      <p class="ld-coach-text">${highIds || '—'}</p>
    </div>
    <div class="ld-tutor-block">
      <h4>Human Review 필요 문항</h4>
      <p class="ld-coach-text">${reviewIds || '—'}</p>
    </div>
  `;
}

function renderReviewerCard(card, reviewer) {
  if (!card) return;
  if (!reviewer) {
    card.innerHTML = '<p class="ld-empty">Reviewer Mode 요약을 불러오지 못했습니다.</p>';
    return;
  }
  const by = reviewer.byStatus || {};
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Overrides</dt><dd>${Number(reviewer.totalOverrides) || 0}</dd></div>
      <div><dt>Review Records</dt><dd>${Number(reviewer.reviewRecords) || 0}</dd></div>
      <div><dt>Needs Verify</dt><dd>${Number(reviewer.needsVerify) || 0}</dd></div>
      <div><dt>APPROVED</dt><dd>${Number(by.APPROVED) || 0}</dd></div>
      <div><dt>REVIEWED</dt><dd>${Number(by.REVIEWED) || 0}</dd></div>
    </dl>
    <p class="ld-card-desc">Storage: ${(reviewer.storageKeys || []).join(' · ')}</p>
  `;
}

function renderRecoveryCard(card, recovery) {
  if (!card) return;
  if (!recovery) {
    card.innerHTML = '<p class="ld-empty">Recovery Summary를 불러오지 못했습니다.</p>';
    return;
  }
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Today's Suggestions</dt><dd>${Number(recovery.todaysSuggestions) || 0}</dd></div>
      <div><dt>Pending</dt><dd>${Number(recovery.pending) || 0}</dd></div>
      <div><dt>Approved</dt><dd>${Number(recovery.approved) || 0}</dd></div>
      <div><dt>Rejected</dt><dd>${Number(recovery.rejected) || 0}</dd></div>
      <div><dt>Average Confidence</dt><dd>${escapeHtml(recovery.averageConfidence ?? 0)}</dd></div>
    </dl>
    <p class="ld-card-desc">Storage: ${(recovery.storageKeys || []).join(' · ')}</p>
  `;
}

function renderDashboard(dashboard) {
  window.__studentResolvedRecommendation =
    dashboard.studentWorkspace?.recommendationResolved || null;
  window.__studentResolvedSession =
    dashboard.studentWorkspace?.sessionResolved || [];
  renderTodayStudy(el('card-today-study'), dashboard.todayStudy);
  renderCountList(el('card-mastery'), dashboard.masterySummary, [
    ['MASTERED', 'MASTERED'],
    ['PROFICIENT', 'PROFICIENT'],
    ['PRACTICING', 'PRACTICING'],
    ['LEARNING', 'LEARNING'],
    ['RETRY_REQUIRED', 'RETRY_REQUIRED'],
  ]);
  renderCountList(el('card-weakness'), dashboard.weaknessSummary, [
    ['LOW_ACCURACY', 'LOW_ACCURACY'],
    ['REPEATED_MISS', 'REPEATED_MISS'],
    ['CALCULATION_ERROR', 'CALCULATION_ERROR'],
    ['CONCEPT_ERROR', 'CONCEPT_ERROR'],
    ['SLOW_RESPONSE', 'SLOW_RESPONSE'],
  ]);
  renderPlans(el('card-plans'), dashboard.todaysPlans);
  renderStrategies(el('card-strategies'), dashboard.todaysStrategies);
  renderRecommendation(el('card-recommendation'), dashboard.recommendationSummary);
  renderSession(el('card-session'), dashboard.studySession);

  const meta = el('dashboard-meta');
  if (meta) {
    meta.textContent = `생성 ${dashboard.generatedAt || ''} · Storage 읽기 전용 · Coach via Adapter`;
  }
}

function renderStudentWidgets(view) {
  showSkeletons();
  const recommendations = attachEvidenceToRecommendations(
    view.recommendations || [],
    view._questions || [],
  );
  const strategy = view.examStrategy || null;
  const goalDash = view.examGoalDashboard || null;

  const remountGoal = () => {
    try {
      view.examGoalDashboard = buildExamGoalDashboard({
        questions: view._questions || [],
        patterns: view._patterns || [],
      });
      view.examStrategy = view.examGoalDashboard?.modeStrategy?.strategy || strategy;
      renderStudentWidgets(view);
    } catch (err) {
      console.warn('[exam-goal] remount failed', err?.message || err);
    }
  };

  mountWidgets(
    {
      examModeCard: (node) => renderExamModeCard(node, goalDash?.examModeCard),
      examGoalForm: (node) =>
        renderExamGoalForm(node, getExamGoal(), (payload) => {
          const result = saveExamGoal(payload);
          const status = node.querySelector('[data-eg-status]');
          if (status) {
            status.hidden = false;
            if (result.ok) {
              status.className = 'eg-form-status is-ok';
              status.textContent = '목표가 저장되었습니다.';
              remountGoal();
            } else {
              status.className = 'eg-form-status is-err';
              status.textContent = `저장 실패: ${(result.errors || []).join(', ')}`;
            }
          }
        }),
      examCountdown: (node) => renderExamCountdown(node, goalDash?.countdown),
      examGoalProgress: (node) => renderGoalProgress(node, goalDash?.goalProgress),
      examTodayMission: (node) =>
        renderTodayMission(node, goalDash?.todayMission, (taskId, completed) => {
          setTaskCompleted(taskId, completed);
          remountGoal();
        }),
      examRiskAlert: (node) => renderRiskAlert(node, goalDash?.riskAlert),
      examCompletionStreak: (node) =>
        renderCompletionStreak(node, goalDash?.completionStreak),
      solutionQuality: (node) => {
        const dash = getDashboardSolutionQuality();
        node.innerHTML = renderDashboardQualityCard(dash.aggregate || dash);
      },
      aiStatus: (node) => {
        const status = getAiConnectionStatus();
        const gem = view.geminiSolver || getGeminiDashboardStats();
        const prof = view.professorQuality || getProfessorDashboardStats();
        node.innerHTML = renderAiStatusCard({
          ...(view.aiStatus || status),
          ...status,
          cacheHit: (gem.cacheHit || 0) + (prof.cacheHit || 0),
          cacheMiss: (gem.cacheMiss || 0) + (prof.cacheMiss || 0),
          lastApi: status.lastApiAt || status.lastConnectedAt || null,
        });
      },
      aiRuntime: (node) => {
        node.innerHTML = renderAiRuntimeCard(
          view.aiRuntime || getAiRuntimeDashboardStats(),
        );
      },
      geminiSolver: (node) => {
        const stats = view.geminiSolver || getGeminiDashboardStats();
        node.innerHTML = renderGeminiSolverCard(stats);
      },
      professorQuality: (node) => {
        const stats = view.professorQuality || getProfessorDashboardStats();
        node.innerHTML = renderProfessorQualityCard(stats);
      },
      visionOcr: (node) => {
        const stats = view.visionOcr || getVisionDashboardStats();
        node.innerHTML = renderVisionOcrCard(stats);
      },
      personalTextbook: (node) => {
        try {
          maybeAutoCreateFinalBook();
        } catch (_e) {
          /* non-critical */
        }
        node.innerHTML = renderPersonalTextbookCard(getTextbookDashboardCard());
      },
      finalRevisionBook: (node) => {
        node.innerHTML = renderFinalRevisionCard(getFinalBookDashboardCard());
      },
      importProgress: (node) => {
        node.innerHTML = renderImportProgressCard(getImportDashboardCard());
      },
      pass60: (node) => {
        node.innerHTML = renderPass60Card(getPass60DashboardCard());
      },
      roiGauge: (node) => {
        node.innerHTML = renderRoiGaugeCard(getRoiDashboardCard());
      },
      expectedScore: (node) => {
        const p = getPass60DashboardCard();
        node.innerHTML = renderExpectedScoreCard(p);
      },
      remainingPattern: (node) => {
        const p = getPass60DashboardCard();
        node.innerHTML = renderRemainingPatternCard(p);
      },
      examDailyPlan: (node) => renderDailyPlanCard(node, strategy?.dailyPlan),
      examMasteryMap: (node) => renderMasteryMap(node, strategy?.masteryMap),
      examDangerPatterns: (node) => renderDangerPatterns(node, strategy?.dangerTop5),
      examReadiness: (node) => renderReadinessCard(node, strategy?.readiness),
      examStrategy: (node) => renderStrategyCard(node, strategy),
      examPatternRisk: (node) => renderPatternRiskList(node, strategy?.riskMap?.list),
      todayStudy: (node) => {
        node.innerHTML = renderTodayStudyCards(view.todayStudy);
        mountAnimatedBars(node);
      },
      masterySummary: (node) => renderMasterySummary(node, view.masterySummary),
      weakPattern: (node) => renderWeakPattern(node, view.weakPatterns),
      recommendation: (node) => renderRecommendationList(node, recommendations),
      todaysReview: (node) => renderReviewBoard(node, view.reviewBoard),
      heatmap: (node) => renderHeatmap(node, view.heatmapDays),
      recentGrowth: (node) => renderRecentGrowth(node, view),
      weeklyStats: (node) => renderWeeklyStats(node, view.weeklyStats),
      recentActivity: (node) => renderRecentActivity(node, view.recentActivity),
      quickStart: (node) => renderQuickStart(node),
    },
    view,
  );
}

async function main() {
  applyTheme();
  mountSubjectSwitch(async () => {
    try {
      await buildPatternIntelligence({ subjectId: getCurrentSubjectId(), availableMinutes: 180 });
    } catch (_e) { /* ignore */ }
    const tb = el('widget-personal-textbook');
    if (tb) tb.innerHTML = renderPersonalTextbookCard(getTextbookDashboardCard());
    const fb = el('widget-final-revision');
    if (fb) fb.innerHTML = renderFinalRevisionCard(getFinalBookDashboardCard());
    const p60 = el('widget-pass60');
    if (p60) p60.innerHTML = renderPass60Card(getPass60DashboardCard());
    const roi = el('widget-roi-gauge');
    if (roi) roi.innerHTML = renderRoiGaugeCard(getRoiDashboardCard());
    const exp = el('widget-expected-score');
    if (exp) exp.innerHTML = renderExpectedScoreCard(getPass60DashboardCard());
    const rem = el('widget-remaining-pattern');
    if (rem) rem.innerHTML = renderRemainingPatternCard(getPass60DashboardCard());
    const meta = el('dashboard-meta');
    if (meta) {
      meta.textContent = `Sprint-19C · Subject ${getCurrentSubjectId()} · ROI / Pass60`;
    }
  });
  const status = el('dashboard-status');
  const startedAt = performance.now();
  try {
    showSkeletons();
    try {
      const reportRes = await fetch('subjects/import-report.json', { cache: 'no-store' });
      if (reportRes.ok) {
        const report = await reportRes.json();
        updateImportProgress({
          totalPdf: report.totalPdf ?? 0,
          completed: report.completed ?? 0,
          failed: report.failed ?? 0,
          ocrQualityAvg: report.ocrQualityAvg ?? 0,
          questionCount: report.questionCount ?? 0,
          subjectCount: report.subjectCount ?? 0,
        });
      }
    } catch (_imp) {
      /* import report optional */
    }
    try {
      await buildPatternIntelligence({
        subjectId: getCurrentSubjectId(),
        availableMinutes: 180,
      });
    } catch (_pi) {
      /* Pattern Intelligence optional on dashboard */
    }
    const { ok, dashboard } = loadDashboard();
    if (!ok || !dashboard) {
      if (status) status.textContent = 'Dashboard를 불러오지 못했습니다.';
      return;
    }
    let resolvedDashboard = dashboard;
    let questions = [];
    let patterns = [];
    try {
      const db = await loadPhase1Database();
      if (db.valid) {
        questions = db.questions || [];
        patterns = db.patterns || [];
        resolvedDashboard = enrichDashboardWithResolved(dashboard, questions);
        try {
          const leDashboard = buildLearningDashboard(questions, patterns);
          resolvedDashboard.learningEngine = leDashboard;
        } catch (_le) { /* Learning Engine non-critical */ }
      }
    } catch (_err) {
      /* keep base dashboard when DB load fails */
    }

    const studentView = buildStudentDashboardView(questions, patterns);
    studentView._questions = questions;
    studentView._patterns = patterns;
    try {
      studentView.examStrategy = generateExamStrategy({ questions, patterns });
    } catch (err) {
      console.warn('[exam-strategy]', err?.message || err);
      studentView.examStrategy = null;
    }
    try {
      studentView.examGoalDashboard = buildExamGoalDashboard({ questions, patterns });
      if (studentView.examGoalDashboard?.modeStrategy?.strategy) {
        studentView.examStrategy = studentView.examGoalDashboard.modeStrategy.strategy;
      }
    } catch (err) {
      console.warn('[exam-goal]', err?.message || err);
      studentView.examGoalDashboard = null;
    }
    renderStudentWidgets(studentView);
    renderDashboard(resolvedDashboard);
    /* Sprint-17B — idle prewarm Vision cache for recommendations / today study */
    try {
      const recoQs = (studentView.recommendations || [])
        .map((r) => questions.find((q) => q.questionId === r.questionId))
        .filter(Boolean);
      const warmList = recoQs.length
        ? recoQs
        : questions.slice(0, 5);
      prewarmVisionCache(warmList, { limit: 6 });
    } catch (_err) {
      /* non-critical */
    }
    if (status) status.textContent = 'Student Dashboard 준비 완료 · Coach 로딩…';

    const coach = await buildCoachDashboard();
    renderCoachCard(el('card-today-coach'), coach.today);
    renderCoachCard(el('card-pattern-coach'), coach.pattern);
    renderCoachCard(el('card-recommendation-coach'), coach.recommendation);

    const patternTutor = await buildPatternTutorDashboardCard();
    renderPatternTutorCard(el('card-pattern-tutor'), patternTutor);

    const questionTutor = await buildQuestionTutorDashboardCard();
    renderQuestionTutorCard(el('card-question-tutor'), questionTutor);

    const integrity = await loadIntegrityReport();
    renderIntegrityCard(el('card-integrity'), integrity);

    const reviewer = buildReviewerDashboardCard();
    renderReviewerCard(el('card-reviewer'), reviewer);

    const recovery = buildRecoveryDashboardCard();
    renderRecoveryCard(el('card-recovery'), recovery);

    const elapsed = Math.round(performance.now() - startedAt);
    if (status) {
      const mismatch = Number(integrity?.mismatchCount) || 0;
      const overrides = Number(reviewer?.totalOverrides) || 0;
      const pending = Number(recovery?.pending) || 0;
      status.textContent = `Student Dashboard 준비 완료 · Widgets ${widgetCount()} · ${elapsed}ms · Integrity ${mismatch} · Overrides ${overrides} · Recovery pending ${pending}`;
    }
    const meta = el('dashboard-meta');
    if (meta) {
      meta.textContent = `Sprint-14B · Widgets ${widgetCount()} · render ${elapsed}ms · Learning Engine consume only`;
    }
  } catch (err) {
    if (status) {
      status.textContent = `오류: ${err?.message || 'unknown'}`;
    }
  }
}

main();
