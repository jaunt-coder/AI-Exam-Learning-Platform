/**
 * AI Exam Learning Platform v2
 * App — 애플리케이션 진입점
 */

import { loadPhase1Database } from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import { showPlatformStatus } from './ui.js';
import { loadProgress } from './question-engine.js';

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function renderHomeStats(questions) {
  const el = document.getElementById('home-stats');
  if (!el) return;

  const progress = loadProgress();
  const { totalAnswered, totalCorrect } = progress.stats;
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  el.innerHTML = `
    <ul class="stats-list">
      <li><strong>${questions.length}</strong> MVP 문항</li>
      <li><strong>${totalAnswered}</strong> 풀이 완료</li>
      <li><strong>${pct}%</strong> 누적 정답률</li>
    </ul>
  `;
}

async function initApp() {
  applyTheme();

  try {
    const { questions, patterns, valid, errors, dbSet, dbLabel } = await loadPhase1Database();

    if (!valid) {
      showPlatformStatus(`Database 검증 실패: ${errors.join(', ')}`, 'error');
      return;
    }

    const patternCount = patterns?.length ?? 0;
    const statusMessage =
      dbSet === 'mvp'
        ? `MVP DB 로드 완료 · 회계학 ${questions.length}문항 · ${patternCount} Pattern`
        : `${dbLabel} · ${questions.length}문항`;

    showPlatformStatus(statusMessage, 'success');
    renderHomeStats(questions);
  } catch (error) {
    showPlatformStatus(
      'Database 로드 실패 — 로컬 서버에서 실행해 주세요. (python -m http.server 8080)',
      'error'
    );
  }
}

document.addEventListener('DOMContentLoaded', initApp);
