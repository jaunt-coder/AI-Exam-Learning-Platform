/**
 * Sprint-17D.6 — Exam Reconstruction Prompt
 * Restore exam sheet structure only — NEVER solve.
 */

export const RECONSTRUCTION_PROMPT_VERSION = '17D.6';

export const RECONSTRUCTION_OUTPUT_SCHEMA = `{
  "questionText": "",
  "tables": [{ "id": "t1", "html": "<table>...</table>", "caption": "" }],
  "formulaBlocks": [{ "latex": "", "text": "" }],
  "figureReferences": [{ "id": "fig1", "html": "", "note": "" }],
  "choices": ["", "", "", "", ""],
  "sourcePage": null,
  "sourceFile": null,
  "footnote": ""
}`;

/**
 * Prompt for Gemini Vision reconstruction (solve forbidden).
 */
export function buildReconstructionPrompt(meta = {}) {
  return [
    '당신은 시험지 복원기이다.',
    '문제를 풀지 마라. 정답·해설·추론 금지.',
    '보이는 시험지 구조만 JSON으로 복원하라.',
    '',
    '규칙:',
    '- 표 구조 유지 (<table><tr><td>)',
    '- 숫자 위치·자릿수 유지 (생략·반올림 금지)',
    '- 보기 번호 ①②③④⑤ 유지',
    '- 수식 보존 (가능하면 latex, 아니면 text)',
    '- 띄어쓰기·줄바꿈 복원',
    '- Markdown 표 금지 · JSON만 출력',
    '',
    meta.sourceFile ? `sourceFile 힌트: ${meta.sourceFile}` : '',
    meta.sourcePage != null ? `sourcePage 힌트: ${meta.sourcePage}` : '',
    meta.questionNumber != null ? `문항 번호 힌트: ${meta.questionNumber}` : '',
    '',
    '스키마:',
    RECONSTRUCTION_OUTPUT_SCHEMA,
  ].filter(Boolean).join('\n');
}

export default {
  RECONSTRUCTION_PROMPT_VERSION,
  RECONSTRUCTION_OUTPUT_SCHEMA,
  buildReconstructionPrompt,
};
