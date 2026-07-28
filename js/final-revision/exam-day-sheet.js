/**
 * Sprint-18A — Exam Day Sheet (A4 5~10 pages compressed)
 */

export function buildExamDaySheet(input = {}) {
  const formulas = (input.formulas || []).slice(0, 20);
  const calcPages = (input.calcPages || []).slice(0, 12);
  const mistakes = (input.mistakes || []).slice(0, 15);
  const patterns = (input.patterns || []).slice(0, 12);
  const checklist = input.checklist || [];

  const pages = [
    {
      page: 1,
      title: '공식',
      body: formulas.map((f, i) => `${i + 1}. ${f.formula || f}`),
    },
    {
      page: 2,
      title: '계산 순서',
      body: calcPages.flatMap((p, i) => [
        `${i + 1}. ${p.patternName || p.questionId}`,
        ...(p.steps || []).slice(0, 4).map((s) => `   - ${s}`),
      ]),
    },
    {
      page: 3,
      title: '실수 유형',
      body: mistakes.map((m, i) => `${i + 1}. ${m.mistake || m} (×${m.count || 1})`),
    },
    {
      page: 4,
      title: 'Pattern 핵심',
      body: patterns.map(
        (p, i) =>
          `${i + 1}. ${p.patternName || p.patternId} · Mastery ${p.mastery ?? '—'} · Risk ${p.risk ?? '—'}`,
      ),
    },
    {
      page: 5,
      title: '시험장 체크리스트',
      body: checklist.map((c, i) => `${i + 1}. ${c}`),
    },
  ];

  /* expand toward 5–10 pages if content heavy */
  if (formulas.length > 15) {
    pages.push({
      page: 6,
      title: '공식 (이어서)',
      body: formulas.slice(10).map((f, i) => `${i + 11}. ${f.formula || f}`),
    });
  }
  if (calcPages.length > 6) {
    pages.push({
      page: pages.length + 1,
      title: '계산 순서 (이어서)',
      body: calcPages.slice(6).flatMap((p) => [p.patternName || p.questionId, ...(p.steps || []).slice(0, 3)]),
    });
  }

  while (pages.length < 5) {
    pages.push({
      page: pages.length + 1,
      title: '복습 메모',
      body: ['빈 페이지 — 시험 직전 손글씨 메모용'],
    });
  }

  return {
    title: 'Exam Day Sheet',
    pageCount: Math.min(10, Math.max(5, pages.length)),
    pages: pages.slice(0, 10),
    format: 'A4',
  };
}

export default { buildExamDaySheet };
