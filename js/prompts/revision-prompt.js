/**
 * Sprint-17E — Prompt Layer (Final Revision Book)
 */
export const PROMPT_VERSION_REVISION = '18A';

/**
 * @param {{ chapters?: object[] }} input
 */
export function buildRevisionPrompt(input = {}) {
  return [
    '감정평가사 시험 직전 Final Revision 요약 강사',
    '출제 예측 금지. 핵심 개념·함정·암기만.',
    JSON.stringify(input.chapters || []).slice(0, 8000),
    '{"sections":[{"title":"","bullets":[]}]}',
  ].join('\n');
}

export default { PROMPT_VERSION_REVISION, buildRevisionPrompt };
