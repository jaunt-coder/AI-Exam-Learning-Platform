/**
 * Sprint-14B — Dashboard utilities (UI only)
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function pct(part, total) {
  const t = Number(total) || 0;
  if (!t) return 0;
  return Math.round(((Number(part) || 0) / t) * 100);
}

export function formatMinutes(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

export function stars(priority) {
  const p = clamp(6 - (Number(priority) || 5), 1, 5);
  return '★'.repeat(p) + '☆'.repeat(5 - p);
}

export function dayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

export function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (_e) {
    return fallback;
  }
}

export default {
  escapeHtml,
  clamp,
  pct,
  formatMinutes,
  stars,
  dayKey,
  daysAgo,
  cssVar,
};
