/**
 * Sprint-17A/17C — Diagnosis Builder (whyOthersWrong 중심)
 */

/**
 * @param {object} geminiPayload
 * @param {object} [grade]
 */
export function buildDiagnosisFromGemini(geminiPayload = {}, grade = {}) {
  const others = Array.isArray(geminiPayload.whyOthersWrong)
    ? geminiPayload.whyOthersWrong
    : [];
  const summary = String(
    geminiPayload.mistakeDiagnosis
      || others.filter((s) => !/정답/.test(s)).slice(0, 2).join(' · ')
      || '',
  );
  const misconception = String(
    geminiPayload.misconception || others[0] || '',
  );
  const isCorrect =
    grade.result === 'correct'
    || (grade.selected != null
      && Number(grade.selected) === Number(geminiPayload.correctAnswer));

  const candidates = others.length
    ? others.map((label, i) => ({
        code: `CHOICE_${i + 1}`,
        label: String(label),
        checked: !/정답/.test(String(label)),
        confidence: Number(geminiPayload.confidence) || 0,
      }))
    : [
        {
          code: isCorrect ? 'NONE' : 'GEMINI_DIAGNOSIS',
          label: summary || '진단',
          checked: true,
          confidence: Number(geminiPayload.confidence) || 0,
        },
      ];

  return {
    summary: summary || (isCorrect ? '정답입니다.' : '오답 원인을 확인하세요.'),
    primary: {
      code: isCorrect ? 'NONE' : 'GEMINI_DIAGNOSIS',
      label: isCorrect ? '정답' : '오답 분석',
      confidence: Number(geminiPayload.confidence) || 0,
    },
    candidates,
    whyOthersWrong: others,
    whyAnswer: geminiPayload.whyAnswer || [],
    confidence: {
      percent: Number(geminiPayload.confidence) || 0,
      level:
        (Number(geminiPayload.confidence) || 0) >= 85
          ? 'HIGH'
          : (Number(geminiPayload.confidence) || 0) >= 60
            ? 'MEDIUM'
            : 'LOW',
    },
    misconception,
    source: 'gemini-native',
  };
}

export function buildMisconceptionFromGemini(geminiPayload = {}) {
  const others = geminiPayload.whyOthersWrong || [];
  return {
    summary: String(geminiPayload.misconception || others[0] || ''),
    whyOthersWrong: others,
    tags: [],
    source: 'gemini-native',
  };
}

export default {
  buildDiagnosisFromGemini,
  buildMisconceptionFromGemini,
};
