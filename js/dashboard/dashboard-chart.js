/**
 * Sprint-14B — Vanilla Canvas chart helpers (no D3)
 */

import { cssVar } from './dashboard-utils.js';

function sizeCanvas(canvas, cssHeight = 180) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height: cssHeight };
}

export function drawLineChart(canvas, series = [], options = {}) {
  if (!canvas) return;
  const { ctx, width, height } = sizeCanvas(canvas, options.height || 180);
  ctx.clearRect(0, 0, width, height);
  const pad = 28;
  const values = series.map((p) => Number(p.value) || 0);
  const max = Math.max(1, ...(values.length ? values : [1]));
  const min = Math.min(0, ...(values.length ? values : [0]));
  const range = max - min || 1;
  const color = options.color || cssVar('--color-primary', '#2f6fed');
  const axis = cssVar('--color-border', '#d0d5dd');
  const text = cssVar('--color-text-muted', '#667085');

  ctx.strokeStyle = axis;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  if (values.length < 2) {
    ctx.fillStyle = text;
    ctx.font = '12px sans-serif';
    ctx.fillText('데이터 부족', pad + 8, height / 2);
    return;
  }

  const stepX = (width - pad * 2) / (values.length - 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = color;
  values.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawRadarChart(canvas, labels = [], values = [], options = {}) {
  if (!canvas) return;
  const size = options.height || 220;
  const { ctx, width, height } = sizeCanvas(canvas, size);
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.35;
  const n = Math.max(labels.length, 3);
  const axis = cssVar('--color-border', '#d0d5dd');
  const fill = options.color || cssVar('--color-primary', '#2f6fed');
  const text = cssVar('--color-text-muted', '#667085');

  for (let ring = 1; ring <= 4; ring += 1) {
    const rr = (r * ring) / 4;
    ctx.strokeStyle = axis;
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < n; i += 1) {
    const val = Math.max(0, Math.min(100, Number(values[i]) || 0)) / 100;
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const x = cx + Math.cos(a) * r * val;
    const y = cy + Math.sin(a) * r * val;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = `${fill}33`;
  ctx.strokeStyle = fill;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = text;
  ctx.font = '11px sans-serif';
  labels.forEach((label, i) => {
    const a = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const x = cx + Math.cos(a) * (r + 16);
    const y = cy + Math.sin(a) * (r + 16);
    ctx.textAlign = 'center';
    ctx.fillText(String(label || '').slice(0, 10), x, y);
  });
}

export function drawDonut(canvas, valuePct, options = {}) {
  if (!canvas) return;
  const size = options.height || 120;
  const { ctx, width, height } = sizeCanvas(canvas, size);
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.38;
  const pct = Math.max(0, Math.min(100, Number(valuePct) || 0));
  const track = cssVar('--color-border', '#d0d5dd');
  const color = options.color || cssVar('--color-primary', '#2f6fed');

  ctx.lineWidth = 10;
  ctx.strokeStyle = track;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
  ctx.stroke();

  ctx.fillStyle = cssVar('--color-text', '#101828');
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct}%`, cx, cy);
}

export default {
  drawLineChart,
  drawRadarChart,
  drawDonut,
};
