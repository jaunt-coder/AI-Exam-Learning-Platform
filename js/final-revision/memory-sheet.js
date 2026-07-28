/**
 * Sprint-18A — 30-second Memory Sheet
 * Sprint-19A — subject memory-config title/seconds
 */

import { getSubjectMemoryConfig } from '../subject/subject-adapter.js';

export function buildMemorySheet(input = {}) {
  const cfg = getSubjectMemoryConfig(input.subjectId) || {};
  const formulas = (input.formulas || []).slice(0, 12);
  const mistakes = (input.mistakes || []).slice(0, 8);
  const patterns = (input.patterns || []).slice(0, 8);

  const cards = [
    ...formulas.map((f) => ({
      type: 'formula',
      front: '공식',
      back: f.formula || String(f),
    })),
    ...mistakes.map((m) => ({
      type: 'mistake',
      front: '실수 주의',
      back: m.mistake || String(m),
    })),
    ...patterns.map((p) => ({
      type: 'pattern',
      front: p.patternName || p.patternId,
      back: `Mastery ${p.mastery ?? '—'} · 위험도 ${p.risk ?? '—'}`,
    })),
  ];

  return {
    title: cfg.sheetTitle || '30초 암기 Sheet',
    seconds: cfg.sheetSeconds || 30,
    subjectId: cfg.subjectId || input.subjectId || null,
    cards,
    sheetText: cards.map((c, i) => `${i + 1}. [${c.front}] ${c.back}`).join('\n'),
  };
}

export default { buildMemorySheet };
