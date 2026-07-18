/**
 * AI Exam Learning Platform v2
 * Chart Engine — Canvas 기반 학습 그래프 (Phase 7.1)
 * 외부 라이브러리 없음 · GitHub Pages 호환
 */

/**
 * CSS 변수 또는 fallback 색상
 * @param {string} name
 * @param {string} fallback
 */
function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Canvas DPI 스케일 적용
 * @param {HTMLCanvasElement} canvas
 */
function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {object} padding
 */
function clearChart(ctx, width, height, padding) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = cssVar('--color-border', '#e2e8f0');
  ctx.lineWidth = 1;
  ctx.strokeRect(padding.left, padding.top, width - padding.left - padding.right, height - padding.top - padding.bottom);
}

/**
 * 날짜별 풀이량(막대) + 정답률(선) 복합 차트
 * @param {HTMLCanvasElement} canvas
 * @param {array} dailyTrend — { date, answered, accuracy }
 * @param {object} [options]
 */
export function renderGrowthChart(canvas, dailyTrend, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 24, right: 48, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  clearChart(ctx, width, height, padding);

  if (!dailyTrend || dailyTrend.length === 0) {
    ctx.fillStyle = cssVar('--color-text-muted', '#64748b');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.emptyLabel || '학습 기록이 없습니다', width / 2, height / 2);
    return;
  }

  const maxAnswered = Math.max(1, ...dailyTrend.map((d) => d.answered));
  const barWidth = Math.min(48, (chartW / dailyTrend.length) * 0.55);
  const gap = chartW / dailyTrend.length;

  const primary = cssVar('--color-primary', '#2563eb');
  const success = cssVar('--color-success', '#16a34a');
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.font = '11px sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'right';
  ctx.fillText(String(maxAnswered), padding.left - 8, padding.top + 4);
  ctx.fillText('0', padding.left - 8, padding.top + chartH);

  ctx.textAlign = 'left';
  ctx.fillText('100%', width - padding.right + 6, padding.top + 4);
  ctx.fillText('0%', width - padding.right + 6, padding.top + chartH);

  ctx.strokeStyle = cssVar('--color-border', '#e2e8f0');
  ctx.setLineDash([4, 4]);
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const linePoints = [];

  dailyTrend.forEach((point, index) => {
    const cx = padding.left + gap * index + gap / 2;
    const barH = (point.answered / maxAnswered) * chartH;
    const barX = cx - barWidth / 2;
    const barY = padding.top + chartH - barH;

    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(barX, barY, barWidth, barH);
    ctx.globalAlpha = 1;

    const accY = padding.top + chartH - (point.accuracy / 100) * chartH;
    linePoints.push({ x: cx, y: accY });

    const label = point.date.slice(5);
    ctx.fillStyle = muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, height - padding.bottom + 16);
  });

  if (linePoints.length > 1) {
    ctx.strokeStyle = success;
    ctx.lineWidth = 2;
    ctx.beginPath();
    linePoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    linePoints.forEach((p) => {
      ctx.fillStyle = success;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || '날짜별 학습 추이', padding.left, 16);

  ctx.fillStyle = primary;
  ctx.fillRect(padding.left, height - 12, 10, 10);
  ctx.fillStyle = muted;
  ctx.font = '11px sans-serif';
  ctx.fillText('풀이량', padding.left + 14, height - 3);

  ctx.fillStyle = success;
  ctx.beginPath();
  ctx.arc(padding.left + 72, height - 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted;
  ctx.fillText('정답률(%)', padding.left + 80, height - 3);
}

/**
 * Pattern 취약도 가로 막대 차트
 * @param {HTMLCanvasElement} canvas
 * @param {array} items — { label, value, sublabel? }
 * @param {object} [options]
 */
export function renderWeaknessChart(canvas, items, options = {}) {
  if (!canvas) return;

  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { top: 28, right: 24, bottom: 16, left: 120 };
  const chartW = width - padding.left - padding.right;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = cssVar('--color-surface', '#ffffff');
  ctx.fillRect(0, 0, width, height);

  if (!items || items.length === 0) {
    ctx.fillStyle = cssVar('--color-text-muted', '#64748b');
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.emptyLabel || '취약 Pattern 데이터 없음', width / 2, height / 2);
    return;
  }

  const barCount = items.length;
  const rowH = (height - padding.top - padding.bottom) / barCount;
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const error = cssVar('--color-error', '#dc2626');
  const warn = '#ea580c';
  const muted = cssVar('--color-text-muted', '#64748b');
  const text = cssVar('--color-text', '#1e293b');

  ctx.fillStyle = text;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || '취약 Pattern TOP 3', padding.left, 16);

  items.forEach((item, index) => {
    const y = padding.top + index * rowH + rowH * 0.15;
    const barH = rowH * 0.55;
    const barLen = (item.value / maxVal) * chartW;

    ctx.fillStyle = muted;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    const label = item.label.length > 14 ? `${item.label.slice(0, 14)}…` : item.label;
    ctx.fillText(label, padding.left - 8, y + barH / 2 + 4);

    const barColor = index === 0 ? error : index === 1 ? warn : cssVar('--color-primary', '#2563eb');
    ctx.fillStyle = barColor;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(padding.left, y, barLen, barH);
    ctx.globalAlpha = 1;

    ctx.fillStyle = text;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${item.value}`, padding.left + barLen + 6, y + barH / 2 + 4);

    if (item.sublabel) {
      ctx.fillStyle = muted;
      ctx.font = '10px sans-serif';
      ctx.fillText(item.sublabel, padding.left, y + barH + 12);
    }
  });
}

/**
 * 차트 리사이즈 관찰 — 반환값은 disconnect 함수
 * @param {HTMLCanvasElement} canvas
 * @param {function} renderFn
 */
export function observeChartResize(canvas, renderFn) {
  if (!canvas || typeof renderFn !== 'function') {
    return () => {};
  }

  let frame = null;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(renderFn);
  });

  ro.observe(canvas);
  renderFn();

  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
  };
}
