/**
 * Sprint-19C — Pattern Intelligence page controller
 */

import { getItem, STORAGE_KEYS } from './storage.js';
import {
  ensureBuiltinSubjectsRegistered,
  getCurrentSubjectId,
  switchSubject,
  SUBJECT_LABELS,
  SUBJECT_FULL_NAMES,
} from './subject/subject-adapter.js';
import {
  buildPatternIntelligence,
  buildPatternDetailLinks,
  exportPass60Report,
  exportRoiReport,
  downloadText,
} from './pattern-map/pattern-map-engine.js';

let snapshot = null;

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function el(id) {
  return document.getElementById(id);
}

function syncSubjectSwitch() {
  const nav = el('pi-subject-switch');
  if (!nav) return;
  const current = getCurrentSubjectId();
  nav.querySelectorAll('[data-subject]').forEach((btn) => {
    const id = btn.getAttribute('data-subject');
    const on = id === current;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-active', on);
  });
}

function renderPass60(plan) {
  if (!plan) return '<p class="pi-empty">Pass60 데이터 없음</p>';
  return `
    <ol class="pi-flow">
      <li>전체 Pattern <strong>${plan.totalPatterns}</strong></li>
      <li>합격 핵심 Pattern <strong>${plan.corePatterns}</strong></li>
      <li>현재 Master <strong>${plan.masteredCore}</strong></li>
      <li>남은 Pattern <strong>${plan.remainingPatterns}</strong></li>
      <li>예상 점수 <strong>${plan.expectedScore}점</strong> (${plan.expectedRange?.[0]}~${plan.expectedRange?.[1]})</li>
    </ol>
    <blockquote class="pi-advice">${plan.advice || ''}</blockquote>
    <ul class="pi-remain">
      ${(plan.remainingList || []).map((r) => `
        <li>
          <button type="button" class="pi-pattern-link" data-pattern-id="${r.patternId}">
            ${r.starsLabel || ''} <strong>${r.name}</strong>
          </button>
          · ROI ${r.roi} · Mastery ${r.mastery}% · +${r.expectedScoreGain}
        </li>`).join('')}
    </ul>`;
}

function renderToday(mission) {
  if (!mission) return '';
  return `
    <p class="pi-mission-msg">${mission.message || ''}</p>
    <ol class="pi-today-list">
      ${(mission.patterns || []).map((p) => `
        <li>
          <strong>${p.minutes}분</strong> ·
          <button type="button" class="pi-pattern-link" data-pattern-id="${p.patternId}">${p.name}</button>
          · ROI ${p.roi} · +${p.expectedScoreGain}
        </li>`).join('')}
    </ol>
    <p>예상 점수 <strong>+${mission.expectedScoreGain}</strong></p>`;
}

function renderWeek(mission) {
  if (!mission) return '';
  return `<p>${mission.message || ''}</p>
    <p>Pattern ${mission.patternCount}개 · ${mission.estimatedMinutes}분 · 예상 +${mission.expectedScoreGain}</p>`;
}

function renderDday(dday) {
  if (!dday) return '';
  return `
    <p><strong>${dday.phase}</strong> · ${dday.focus}</p>
    <ul>${(dday.actions || []).map((a) => `<li>${a}</li>`).join('')}</ul>
    <p>D-Day: ${dday.daysRemaining == null ? '미설정' : `D-${dday.daysRemaining}`}</p>`;
}

function renderTop10(top10) {
  return `
    <ol class="pi-top10-list">
      ${(top10 || []).map((r, i) => `
        <li>
          <span class="pi-rank">${i + 1}</span>
          <button type="button" class="pi-pattern-link" data-pattern-id="${r.patternId}">
            ${r.name}
          </button>
          <span class="pi-stars">${r.starsLabel || ''}</span>
          <span class="pi-roi">ROI ${r.roi}</span>
        </li>`).join('')}
    </ol>`;
}

function renderList(ranked) {
  return `
    <ul class="pi-pattern-cards">
      ${(ranked || []).map((r) => `
        <li class="pi-pattern-card roi-band-${(r.band || 'b').toLowerCase()}">
          <button type="button" class="pi-pattern-link" data-pattern-id="${r.patternId}">
            <span class="pi-stars">${r.starsLabel}</span>
            <strong>${r.name}</strong>
          </button>
          <dl class="pi-meta">
            <div><dt>출제</dt><dd>${r.frequency}</dd></div>
            <div><dt>Mastery</dt><dd>${r.mastery}%</dd></div>
            <div><dt>최근오답</dt><dd>${r.recentWrong}</dd></div>
            <div><dt>예상 점수</dt><dd>+${r.expectedScoreGain}</dd></div>
            <div><dt>ROI</dt><dd>${r.roi}</dd></div>
            <div><dt>Priority</dt><dd>${r.priority}</dd></div>
          </dl>
          ${r.recommend ? '<p class="pi-rec">추천 ★★★★★</p>' : ''}
        </li>`).join('')}
    </ul>`;
}

function renderHeat(cells, key) {
  return `
    <div class="pi-heat-grid">
      ${(cells || []).slice(0, 24).map((c) => `
        <button type="button" class="pi-heat-cell ${c.colorClass || c.level || ''}"
          data-pattern-id="${c.patternId}" title="${c.name}">
          <span>${c.name}</span>
          <strong>${key === 'roi' ? `ROI ${c.roi}` : c.intensity}</strong>
        </button>`).join('')}
    </div>`;
}

function showDetail(patternId) {
  const row = (snapshot?.ranked || []).find((r) => r.patternId === patternId);
  const links = buildPatternDetailLinks(patternId);
  const section = el('pi-detail-section');
  const box = el('pi-detail');
  if (!section || !box) return;
  section.hidden = false;
  box.innerHTML = `
    <h4>${row?.starsLabel || ''} ${row?.name || patternId}</h4>
    <p>ROI ${row?.roi ?? '—'} · Mastery ${row?.mastery ?? '—'}% · +${row?.expectedScoreGain ?? '—'} / ${row?.estimatedMinutes ?? '—'}분</p>
    <nav class="pi-detail-links" aria-label="Pattern Detail">
      ${links.links.map((l) => `<a class="button button--ghost" href="${l.href}">${l.label}</a>`).join('')}
    </nav>`;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindPatternClicks(root = document) {
  root.querySelectorAll('[data-pattern-id]').forEach((node) => {
    node.addEventListener('click', () => {
      const id = node.getAttribute('data-pattern-id');
      if (id) showDetail(id);
    });
  });
}

async function refresh() {
  const status = el('pi-status');
  const subjectId = getCurrentSubjectId();
  if (status) status.textContent = `${SUBJECT_LABELS[subjectId] || subjectId} 분석 중…`;
  syncSubjectSwitch();

  snapshot = await buildPatternIntelligence({
    subjectId,
    availableMinutes: 180,
  });

  el('pi-pass60').innerHTML = renderPass60(snapshot.pass60);
  el('pi-today').innerHTML = renderToday(snapshot.todayMission);
  el('pi-week').innerHTML = renderWeek(snapshot.weekMission);
  el('pi-dday').innerHTML = renderDday(snapshot.dday);
  el('pi-top10').innerHTML = renderTop10(snapshot.top10);
  el('pi-list').innerHTML = renderList(snapshot.ranked);
  el('pi-weak-heat').innerHTML = renderHeat(snapshot.weaknessHeatmap?.cells, 'weak');
  el('pi-roi-heat').innerHTML = renderHeat(snapshot.roiHeatmap?.cells, 'roi');

  bindPatternClicks();
  if (status) {
    status.textContent = `${SUBJECT_FULL_NAMES[subjectId] || subjectId} · Pattern ${snapshot.totalPatterns} · Pass60 예상 ${snapshot.pass60?.expectedScore ?? '—'}점`;
  }
}

function bindExports() {
  el('btn-export-pass60-md')?.addEventListener('click', () => {
    downloadText('pass60-report.md', exportPass60Report(snapshot?.pass60, 'markdown'), 'text/markdown');
  });
  el('btn-export-pass60-html')?.addEventListener('click', () => {
    const html = exportPass60Report(snapshot?.pass60, 'html');
    downloadText('pass60-report.html', html, 'text/html');
  });
  el('btn-export-roi-md')?.addEventListener('click', () => {
    downloadText('roi-report.md', exportRoiReport(snapshot, 'markdown'), 'text/markdown');
  });
  el('btn-export-roi-html')?.addEventListener('click', () => {
    const html = exportRoiReport(snapshot, 'html');
    downloadText('roi-report.html', html, 'text/html');
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    }
  });
}

async function main() {
  applyTheme();
  ensureBuiltinSubjectsRegistered();
  syncSubjectSwitch();
  bindExports();

  el('pi-subject-switch')?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-subject]');
    if (!btn) return;
    const id = btn.getAttribute('data-subject');
    if (!id || id === getCurrentSubjectId()) return;
    await switchSubject(id);
    await refresh();
  });

  try {
    await refresh();
  } catch (err) {
    const status = el('pi-status');
    if (status) status.textContent = `오류: ${err?.message || 'unknown'}`;
  }
}

main();
