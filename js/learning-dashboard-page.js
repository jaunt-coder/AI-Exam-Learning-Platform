/**
 * Sprint-10E — Learning Dashboard page controller (UI only).
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import { loadDashboard } from './dashboard-service.js';
import { buildCoachDashboard } from './coach/ai-coach-service.js';
import { buildPatternTutorDashboardCard } from './coach/pattern-tutor.js';
import { buildQuestionTutorDashboardCard } from './coach/question-tutor.js';
import { buildReviewerDashboardCard } from './reviewer/review-service.js';

const INTEGRITY_REPORT_URL = 'data/question-integrity-report.json';

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
  card.innerHTML = `
    <dl class="ld-dl">
      <div><dt>Active</dt><dd>${Number(summary.active) || 0}</dd></div>
      <div><dt>Total</dt><dd>${Number(summary.total) || 0}</dd></div>
      <div><dt>Estimated Minutes</dt><dd>${Number(summary.estimatedMinutes) || 0}분</dd></div>
      <div><dt>Highest Priority</dt><dd>${escapeHtml(top?.reasonCode || '—')} · ${escapeHtml(top?.patternId || '')}</dd></div>
    </dl>
    <p class="ld-card-desc" style="margin-top:0.75rem">${escapeHtml(top?.reason || '')}</p>
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

function renderDashboard(dashboard) {
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

async function main() {
  applyTheme();
  const status = el('dashboard-status');
  try {
    const { ok, dashboard } = loadDashboard();
    if (!ok || !dashboard) {
      if (status) status.textContent = 'Dashboard를 불러오지 못했습니다.';
      return;
    }
    renderDashboard(dashboard);
    if (status) status.textContent = 'Learning Dashboard 준비 완료 · Coach 로딩…';

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

    if (status) {
      const mismatch = Number(integrity?.mismatchCount) || 0;
      const overrides = Number(reviewer?.totalOverrides) || 0;
      status.textContent = `Learning Dashboard 준비 완료 · Integrity ${mismatch} · Overrides ${overrides}`;
    }
  } catch (err) {
    if (status) {
      status.textContent = `오류: ${err?.message || 'unknown'}`;
    }
  }
}

main();
