/**
 * Sprint-17E — Prompt Layer (Summary — Personal Textbook AI Summary)
 */
export const PROMPT_VERSION_SUMMARY = '18A';
export const SUMMARY_PROMPT_ROLE =
  '감정평가사 시험 학습용 Personal Textbook Summary 작성 강사';

/**
 * @param {{ patternName?: string, entries?: object[] }} input
 */
export function buildSummaryPrompt(input = {}) {
  const entries = Array.isArray(input.entries) ? input.entries : [];
  return [
    SUMMARY_PROMPT_ROLE,
    `Pattern: ${input.patternName || ''}`,
    '아래 해설을 압축 요약하라. JSON만 반환.',
    JSON.stringify(entries.slice(0, 20)),
    '{"summary":"","keyPoints":[],"traps":[],"memory":""}',
  ].join('\n');
}

export default { PROMPT_VERSION_SUMMARY, buildSummaryPrompt };
