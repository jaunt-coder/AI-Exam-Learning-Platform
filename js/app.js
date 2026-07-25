/**
 * AI Exam Learning Platform v2
 * App — Inventory MVP 홈 진입점 (Plane C)
 */

import { loadPhase1Database, filterInventoryScope } from './data-loader.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import { showPlatformStatus } from './ui.js';
import { loadProgress, getWrongAnswerCount, getBookmarkCount } from './question-engine.js';

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function renderHomeStats(questions, patterns) {
  const el = document.getElementById('home-stats');
  if (!el) return;

  const progress = loadProgress();
  const { totalAnswered, totalCorrect } = progress.stats;
  const pct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const recent = getItem(STORAGE_KEYS.RECENT_STUDY, null);
  const recentCount = Array.isArray(recent?.recentQuestions)
    ? recent.recentQuestions.length
    : Array.isArray(recent?.sessions)
      ? recent.sessions.length
      : 0;

  el.innerHTML = `
    <ul class="stats-list">
      <li><strong>${patterns.length}</strong> 재고 Pattern</li>
      <li><strong>${questions.length}</strong> 재고 문항</li>
      <li><strong>${totalAnswered}</strong> 풀이 · <strong>${pct}%</strong> 정답률</li>
      <li><strong>${getWrongAnswerCount()}</strong> 오답 · <strong>${getBookmarkCount()}</strong> 북마크 · <strong>${recentCount}</strong> 최근학습</li>
    </ul>
  `;

  const hint = document.getElementById('home-validation-hint');
  if (hint) {
    hint.textContent =
      '학습 기록은 LocalStorage(progress / wrongAnswers / bookmarks / recentStudy)에 저장됩니다. 키 이름은 변경되지 않습니다.';
  }
}

async function initApp() {
  applyTheme();

  try {
    const db = await loadPhase1Database();

    if (!db.valid) {
      showPlatformStatus(`Database 검증 실패: ${db.errors.join(', ')}`, 'error');
      return;
    }

    const scoped = filterInventoryScope({
      patterns: db.patterns,
      questions: db.questions,
      statistics: db.statistics,
    });

    showPlatformStatus(
      `재고자산 MVP 준비 완료 · ACC_INV_* Pattern ${scoped.patterns.length}개 · ${scoped.questions.length}문항 (읽기 전용)`,
      'success',
    );
    renderHomeStats(scoped.questions, scoped.patterns);
  } catch (error) {
    showPlatformStatus(
      'Database 로드 실패 — 로컬 서버에서 실행해 주세요. (python -m http.server 8080)',
      'error',
    );
  }
}

document.addEventListener('DOMContentLoaded', initApp);
