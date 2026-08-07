/**
 * Sprint-17E — Prompt Layer (Memory / 30초 암기)
 */
export const PROMPT_VERSION_MEMORY = '17D.2';

/**
 * @param {{ coreConcept?: string, traps?: string[] }} input
 */
export function buildMemoryPrompt(input = {}) {
  return [
    '감정평가사 시험 30초 암기 카드 작성',
    `개념: ${input.coreConcept || ''}`,
    `함정: ${(input.traps || []).join(' / ')}`,
    '{"memoryHack":"","examTip":""}',
  ].join('\n');
}

export default { PROMPT_VERSION_MEMORY, buildMemoryPrompt };
