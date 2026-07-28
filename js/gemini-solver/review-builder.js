/**
 * Sprint-17A/17C — 30초 Review / Memory Hack Builder
 */

/**
 * @param {object} geminiPayload
 */
export function buildReview30FromGemini(geminiPayload = {}) {
  const hacks = Array.isArray(geminiPayload.memoryHack) && geminiPayload.memoryHack.length
    ? geminiPayload.memoryHack.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];
  const text = hacks.length
    ? hacks.join('\n')
    : String(geminiPayload.review30 || '').trim();
  const bullets = hacks.length
    ? hacks.map((t) => ({ mark: '✔', text: t }))
    : text
      ? text
          .split(/[\n•·]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((t) => ({ mark: '✔', text: t }))
      : [{ mark: '✔', text: '정답·계산·보기를 30초 안에 복기한다.' }];

  return {
    headline: '30초 암기',
    bullets,
    label: '암기시간',
    seconds: 30,
    raw: text,
    memoryHack: hacks,
    source: 'gemini-native',
  };
}

export default { buildReview30FromGemini };
