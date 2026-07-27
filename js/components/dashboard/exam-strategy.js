/**
 * Sprint-16A — Exam Strategy Dashboard widgets
 */

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMasteryMap(el, masteryMap) {
  if (!el) return;
  const map = masteryMap || {};
  const topics = map.topics || [];
  const patterns = map.patternRows || [];

  const topicRows = (topics.length ? topics : patterns)
    .map((row) => {
      const name = row.name || row.chapterId || row.patternId;
      const score = Number(row.score) || 0;
      const warn = row.warn || score < 60;
      return `
        <li class="es-map-row${warn ? ' is-warn' : ''}">
          <span class="es-map-name">${esc(name)}</span>
          <span class="es-map-bar" aria-hidden="true"><i style="width:${esc(score)}%"></i></span>
          <span class="es-map-score">${esc(score)}%${warn ? ' ⚠' : ''}</span>
        </li>`;
    })
    .join('');

  el.innerHTML = `
    <div class="es-mastery-map">
      <p class="es-kicker">${esc(map.title || '나의 회계학 상태')}</p>
      <ul class="es-map-list">${topicRows || '<li class="ll-hint">학습 기록이 아직 없습니다.</li>'}</ul>
      <p class="es-overall">전체 ${esc(map.overall ?? 0)}%</p>
    </div>`;
}

export function renderDangerPatterns(el, dangerTop5) {
  if (!el) return;
  const rows = (dangerTop5 || [])
    .map(
      (r) => `
      <li class="es-danger-item">
        <span class="es-danger-rank">${esc(r.rank)}</span>
        <span class="es-danger-label">${esc(r.label)}</span>
        ${r.count != null ? `<span class="es-danger-count">${esc(r.count)}</span>` : ''}
      </li>`,
    )
    .join('');

  el.innerHTML = `
    <div class="es-danger">
      <p class="es-kicker">위험 Pattern TOP 5</p>
      <ol class="es-danger-list">${rows || '<li>위험 데이터가 아직 없습니다.</li>'}</ol>
    </div>`;
}

export function renderDailyPlanCard(el, plan) {
  if (!el) return;
  const items = (plan?.items || [])
    .map(
      (it) => `
      <li class="es-plan-item">
        <p class="es-plan-title"><span class="es-stars">${esc(it.stars)}</span> ${esc(it.title)}</p>
        <p class="es-plan-meta">예상 시간 <strong>${esc(it.estimatedMinutes)}분</strong>
          ${it.count ? ` · ${esc(it.count)}${esc(it.unit || '')}` : ''}</p>
        ${it.href ? `<a class="es-plan-link" href="${esc(it.href)}">시작</a>` : ''}
      </li>`,
    )
    .join('');

  el.innerHTML = `
    <div class="es-daily-plan">
      <p class="es-kicker">${esc(plan?.title || '오늘 해야 할 공부')}</p>
      <ul class="es-plan-list">${items || '<li>오늘 계획이 없습니다.</li>'}</ul>
      <p class="es-plan-total">합계 약 ${esc(plan?.totalMinutes || 0)}분</p>
    </div>`;
}

export function renderReadinessCard(el, readiness) {
  if (!el) return;
  const score = readiness?.score ?? '—';
  const pass = readiness?.passProbability ?? score;
  const level = readiness?.level || '—';
  const factors = readiness?.factors || {};

  const factorRows = Object.entries(factors)
    .map(([key, f]) => {
      const labels = {
        mastery: 'Mastery 40%',
        recentAccuracy: '최근 정답률 20%',
        repeatWrong: '반복오답 20%',
        reviewCompliance: '복습 이행률 10%',
        confidence: 'Confidence 10%',
      };
      return `<li><span>${esc(labels[key] || key)}</span><strong>${esc(f.value)}</strong></li>`;
    })
    .join('');

  el.innerHTML = `
    <div class="es-readiness">
      <p class="es-kicker">시험 준비도</p>
      <p class="es-readiness-score"><strong>${esc(score)}</strong><span>/100</span></p>
      <p class="es-readiness-pass">목표 합격 가능성 <strong>${esc(pass)}%</strong> · ${esc(level)}</p>
      <ul class="es-factor-list">${factorRows}</ul>
    </div>`;
}

export function renderStrategyCard(el, strategy) {
  if (!el) return;
  const advice = strategy?.advice || {};
  const top = strategy?.topWeakness || advice.topWeakness;
  const actions = (strategy?.actions || advice.actions || [])
    .map(
      (a) => `
      <li><strong>${esc(a.when)}</strong> ${esc(a.action)}</li>`,
    )
    .join('');

  const mode = strategy?.examMode || {};
  const focus = mode.focus || {};

  el.innerHTML = `
    <div class="es-strategy">
      <p class="es-kicker">${esc(strategy?.title || '현재 상태 분석')}</p>
      <p class="es-strategy-pass">목표 합격 가능성: <strong>${esc(strategy?.passProbability ?? '—')}%</strong></p>
      ${
        top
          ? `<div class="es-strategy-top">
              <p class="es-kicker">가장 먼저 보완할 영역</p>
              <p class="es-strategy-rank">1순위: <strong>${esc(top.label)}</strong></p>
              <p class="es-strategy-reason">이유: ${esc(top.reason || '')}</p>
            </div>`
          : ''
      }
      <div class="es-strategy-actions">
        <p class="es-kicker">추천 행동</p>
        <ul>${actions || '<li>학습 기록이 쌓이면 전략이 생성됩니다.</li>'}</ul>
      </div>
      <div class="es-exam-mode">
        <p class="es-kicker">Exam Mode · ${esc(focus.label || mode.phase || '일반')}</p>
        <p>새 문제 학습 ${esc(focus.newLearning || '—')} · 약점 제거 ${esc(focus.weaknessRemoval || '—')}</p>
        <p class="ll-hint">${esc(focus.advice || advice.advice || '')}</p>
      </div>
    </div>`;
}

export function renderPatternRiskList(el, riskList) {
  if (!el) return;
  const rows = (riskList || [])
    .slice(0, 6)
    .map(
      (r) => `
      <li class="es-risk-item is-${esc(String(r.risk || '').toLowerCase())}">
        <div class="es-risk-head">
          <strong>${esc(r.shortName || r.name || r.patternId)}</strong>
          <span class="es-risk-badge">Risk: ${esc(r.risk)}</span>
        </div>
        <ul class="es-risk-reasons">
          ${(r.reasons || []).map((x) => `<li>${esc(x)}</li>`).join('')}
        </ul>
      </li>`,
    )
    .join('');

  el.innerHTML = `
    <div class="es-pattern-risk">
      <p class="es-kicker">Pattern Risk Score</p>
      <ul class="es-risk-list">${rows || '<li>위험도 데이터가 없습니다.</li>'}</ul>
    </div>`;
}

export default {
  renderMasteryMap,
  renderDangerPatterns,
  renderDailyPlanCard,
  renderReadinessCard,
  renderStrategyCard,
  renderPatternRiskList,
};
