/**
 * Sprint-16B — Exam Mode / Goal Dashboard widgets
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderExamModeCard(el, card) {
  if (!el) return;
  const c = card || {};
  const top3 = (c.todayTop3 || [])
    .map(
      (t, i) => `
      <li>
        <span class="eg-rank">${esc(i + 1)}.</span>
        ${
          t.href
            ? `<a href="${esc(t.href)}">${esc(t.title)}</a>`
            : `<span>${esc(t.title)}</span>`
        }
      </li>`,
    )
    .join('');

  const subjectLabel = (c.subjects || [])[0] || '회계학';

  el.innerHTML = `
    <div class="eg-mode-card" data-exam-mode-card="1">
      <p class="eg-dday">${esc(c.dDay || 'D-?')}</p>
      <p class="eg-pass">현재 예상 합격 가능성 <strong>${esc(c.passProbability ?? c.readinessScore ?? '—')}%</strong></p>
      <p class="eg-target">목표: ${esc(subjectLabel)} ${esc(c.targetScore ?? '—')}점
        ${c.currentScore != null ? ` · 현재 ${esc(c.currentScore)}점` : ''}</p>
      <p class="eg-remain">남은 기간: ${esc(c.daysRemaining ?? '—')}일 · Phase ${esc(c.phaseLabel || c.phase || '—')}</p>
      <p class="eg-kicker">오늘 반드시 해야 할 TOP 3</p>
      <ol class="eg-top3">${top3 || '<li>목표를 설정하면 미션이 생성됩니다.</li>'}</ol>
    </div>`;
}

export function renderExamCountdown(el, countdown) {
  if (!el) return;
  const c = countdown || {};
  el.innerHTML = `
    <div class="eg-countdown">
      <p class="eg-kicker">① Exam Countdown</p>
      <p class="eg-dday">${esc(c.dDay || 'D-?')}</p>
      <p>시험일 ${esc(c.examDate || '—')} · ${esc(c.phase || '')}</p>
    </div>`;
}

export function renderGoalProgress(el, gp) {
  if (!el) return;
  const g = gp || {};
  el.innerHTML = `
    <div class="eg-goal-progress">
      <p class="eg-kicker">② Goal Progress</p>
      <p class="eg-progress-score">${esc(g.currentScore ?? '—')} / ${esc(g.targetScore ?? '—')}</p>
      <div class="eg-progress-bar" aria-hidden="true"><i style="width:${esc(g.progressPct || 0)}%"></i></div>
      <p>진행 ${esc(g.progressPct || 0)}% · 점수 갭 ${esc(g.gap ?? '—')}
        · 하루 ${esc(g.availableMinutes ?? '—')}분</p>
    </div>`;
}

export function renderTodayMission(el, mission, onToggle) {
  if (!el) return;
  const m = mission || {};
  const tasks = (m.tasks || [])
    .map(
      (t) => `
      <li class="eg-mission-item${t.completed ? ' is-done' : ''}">
        <label>
          <input type="checkbox" data-eg-task="${esc(t.id)}" ${t.completed ? 'checked' : ''}>
          <span>${esc(t.title)}</span>
        </label>
      </li>`,
    )
    .join('');

  el.innerHTML = `
    <div class="eg-today-mission">
      <p class="eg-kicker">③ Today's Mission</p>
      <ul class="eg-mission-list">${tasks || '<li>미션 없음</li>'}</ul>
      <p>완료율 ${esc(m.completionRate || 0)}%</p>
      ${
        (m.forbiddenActions || []).length
          ? `<p class="eg-forbid">금지: ${esc((m.forbiddenActions || []).join(' · '))}</p>`
          : ''
      }
    </div>`;

  el.querySelectorAll('[data-eg-task]').forEach((input) => {
    input.addEventListener('change', () => {
      if (typeof onToggle === 'function') {
        onToggle(input.getAttribute('data-eg-task'), input.checked);
      }
    });
  });
}

export function renderRiskAlert(el, alert) {
  if (!el) return;
  const items = (alert?.items || [])
    .slice(0, 5)
    .map(
      (r) => `
      <li><strong>${esc(r.rank || '')}.</strong> ${esc(r.label || r.patternId)}</li>`,
    )
    .join('');
  el.innerHTML = `
    <div class="eg-risk-alert">
      <p class="eg-kicker">④ Risk Alert</p>
      <ol class="eg-risk-alert-list">${items || '<li>위험 Pattern 없음</li>'}</ol>
    </div>`;
}

export function renderCompletionStreak(el, streak) {
  if (!el) return;
  const s = streak || {};
  el.innerHTML = `
    <div class="eg-streak">
      <p class="eg-kicker">⑤ Completion Streak</p>
      <p class="eg-streak-num"><strong>${esc(s.streak || 0)}</strong>일 연속</p>
      <p>최장 ${esc(s.longestStreak || 0)}일 · 오늘 완료율 ${esc(s.todayRate || 0)}%</p>
    </div>`;
}

export function renderExamGoalForm(el, goal, onSave) {
  if (!el) return;
  const g = goal || {};
  el.innerHTML = `
    <form class="eg-goal-form" data-eg-goal-form>
      <p class="eg-kicker">시험 목표 설정</p>
      <label>시험일
        <input type="date" name="examDate" required value="${esc(g.examDate || '')}">
      </label>
      <label>목표 점수
        <input type="number" name="targetScore" min="0" max="100" required value="${esc(g.targetScore ?? 60)}">
      </label>
      <label>현재 점수
        <input type="number" name="currentScore" min="0" max="100" required value="${esc(g.currentScore ?? 0)}">
      </label>
      <label>하루 공부(분)
        <input type="number" name="availableMinutes" min="5" max="720" required value="${esc(g.availableMinutes ?? 60)}">
      </label>
      <label>목표 과목
        <input type="text" name="subjects" required value="${esc((g.subjects || ['회계학']).join(', '))}">
      </label>
      <button type="submit" class="button button--primary button--sm">목표 저장</button>
      <p class="eg-form-status" data-eg-status hidden></p>
    </form>`;

  const form = el.querySelector('[data-eg-goal-form]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const subjects = String(fd.get('subjects') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (typeof onSave === 'function') {
      onSave({
        examDate: String(fd.get('examDate') || ''),
        targetScore: Number(fd.get('targetScore')),
        currentScore: Number(fd.get('currentScore')),
        availableMinutes: Number(fd.get('availableMinutes')),
        subjects,
      });
    }
  });
}

export default {
  renderExamModeCard,
  renderExamCountdown,
  renderGoalProgress,
  renderTodayMission,
  renderRiskAlert,
  renderCompletionStreak,
  renderExamGoalForm,
};
