/**
 * Sprint-17A — 30초 Review Builder
 */

/**
 * @param {object} geminiPayload
 */
export function buildReview30FromGemini(geminiPayload = {}) {
  const text = String(geminiPayload.review30 || '').trim();
  const bullets = text
    ? text
        .split(/[\n•·\-]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((t) => ({ mark: '✔', text: t }))
    : [{ mark: '✔', text: '정답·계산·보기를 30초 안에 복기한다.' }];

  return {
    headline: '30초 복습',
    bullets,
    label: '암기시간',
    seconds: 30,
    raw: text,
    source: 'gemini-native',
  };
}

export default { buildReview30FromGemini };
