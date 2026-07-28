/**
 * Sprint-17A — Diagnosis Builder (mistakeDiagnosis + misconception)
 */

/**
 * @param {object} geminiPayload
 * @param {object} [grade]
 */
export function buildDiagnosisFromGemini(geminiPayload = {}, grade = {}) {
  const summary = String(geminiPayload.mistakeDiagnosis || '');
  const misconception = String(geminiPayload.misconception || '');
  const isCorrect =
    grade.result === 'correct'
    || (grade.selected != null
      && Number(grade.selected) === Number(geminiPayload.correctAnswer));

  return {
    summary: summary || (isCorrect ? '정답입니다.' : '오답 원인을 확인하세요.'),
    primary: {
      code: isCorrect ? 'NONE' : 'GEMINI_DIAGNOSIS',
      label: isCorrect ? '정답' : '문제 풀이 진단',
      confidence: Number(geminiPayload.confidence) || 0,
    },
    candidates: [
      {
        code: isCorrect ? 'NONE' : 'GEMINI_DIAGNOSIS',
        label: summary || '진단',
        checked: true,
        confidence: Number(geminiPayload.confidence) || 0,
      },
    ],
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
  return {
    summary: String(geminiPayload.misconception || ''),
    tags: [],
    source: 'gemini-native',
  };
}

export default {
  buildDiagnosisFromGemini,
  buildMisconceptionFromGemini,
};
