/**
 * Sprint-14C — Evidence utils (explainability only)
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

export function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function stars(score) {
  const s = clamp(Math.round((Number(score) || 0) / 20), 0, 5);
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}

export function toneFromScore(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'green';
  if (s >= 60) return 'yellow';
  if (s >= 40) return 'orange';
  return 'red';
}

export function toneLabel(tone) {
  return (
    {
      green: '근거 충분',
      yellow: '보통',
      orange: '약함',
      red: '긴급 복습',
    }[tone] || '보통'
  );
}

export function memoize(fn, keyFn) {
  const cache = new Map();
  return (...args) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const value = fn(...args);
    cache.set(key, value);
    return value;
  };
}

export default {
  escapeHtml,
  clamp,
  daysSince,
  stars,
  toneFromScore,
  toneLabel,
  memoize,
};
