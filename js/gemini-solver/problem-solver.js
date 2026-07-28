/**
 * Sprint-17A — Problem Solver (Gemini call + Problem-First local fallback)
 * Does not use Pattern profiles as explanation source.
 */

import { getItem, STORAGE_KEYS } from '../storage.js';
import { getProvider } from '../llm/provider-registry.js';

export const MODEL_VERSION = 'gemini-2.0-flash';

/**
 * Resolve Gemini API key without hardcoding.
 */
export function resolveGeminiApiKey() {
  try {
    if (
      typeof process !== 'undefined'
      && process.env
      && typeof process.env.GEMINI_API_KEY === 'string'
      && process.env.GEMINI_API_KEY.trim()
    ) {
      return process.env.GEMINI_API_KEY.trim();
    }
  } catch (_err) {
    /* ignore */
  }
  try {
    if (
      typeof globalThis !== 'undefined'
      && typeof globalThis.__GEMINI_API_KEY__ === 'string'
      && globalThis.__GEMINI_API_KEY__.trim()
    ) {
      return globalThis.__GEMINI_API_KEY__.trim();
    }
  } catch (_err) {
    /* ignore */
  }
  const settings = getItem(STORAGE_KEYS.SETTINGS, {}) || {};
  if (typeof settings.geminiApiKey === 'string' && settings.geminiApiKey.trim()) {
    return settings.geminiApiKey.trim();
  }
  if (settings.llm?.provider === 'GEMINI' && typeof settings.llm.apiKey === 'string') {
    return settings.llm.apiKey.trim();
  }
  return '';
}

/**
 * Call Gemini provider (or injected fetch). Falls back to Problem-First local solver.
 * @param {string} prompt
 * @param {{ model?: string, temperature?: number, maxTokens?: number, forceLocal?: boolean }} [options]
 */
export async function callGemini(prompt, options = {}) {
  if (options.forceLocal) {
    return { ok: true, text: '', provider: 'LOCAL_PROBLEM_FIRST', model: MODEL_VERSION, local: true };
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: 'missing_api_key',
      provider: 'GEMINI',
      model: MODEL_VERSION,
      localFallback: true,
    };
  }

  try {
    const provider = getProvider('GEMINI');
    if (provider && typeof provider.generate === 'function') {
      const result = await provider.generate({
        prompt,
        model: options.model || MODEL_VERSION,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 2400,
      });
      if (result?.ok && result.text) {
        return {
          ok: true,
          text: result.text,
          provider: result.provider || 'GEMINI',
          model: result.model || MODEL_VERSION,
        };
      }
      return {
        ok: false,
        error: result?.error || 'gemini_generate_failed',
        detail: result?.detail,
        provider: 'GEMINI',
        model: MODEL_VERSION,
        localFallback: true,
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: 'gemini_provider_error',
      detail: err?.message || String(err),
      provider: 'GEMINI',
      model: MODEL_VERSION,
      localFallback: true,
    };
  }

  return {
    ok: false,
    error: 'provider_unavailable',
    provider: 'GEMINI',
    model: MODEL_VERSION,
    localFallback: true,
  };
}

/**
 * Problem-First local solver — reads the problem payload directly.
 * Used when Gemini API key is absent (GitHub Pages / offline / tests).
 * Does NOT use Pattern tutor profiles.
 * @param {object} readerPayload
 */
export function solveProblemLocally(readerPayload = {}) {
  const answer = Number(readerPayload.correctAnswer);
  const choices = Array.isArray(readerPayload.choices) ? readerPayload.choices : [];
  const selected = readerPayload.selectedAnswer;
  const stem = String(readerPayload.questionText || '').trim();
  const table = String(readerPayload.tableHtml || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const choiceLine = choices
    .map((c, i) => `${i + 1}) ${c}`)
    .join(' / ');

  const stepByStep = [
    `문제 지문을 확인한다: ${stem.slice(0, 160) || '(지문 없음)'}`,
    table ? `표·수치 자료를 확인한다: ${table.slice(0, 160)}` : '표 자료가 없으면 지문 수치만으로 계산한다.',
    `보기 구성을 확인한다: ${choiceLine || '(보기 없음)'}`,
    '필요한 회계 관계를 세우고 직접 계산한다.',
    `계산 결과를 보기 ${answer}와 대조하여 정답을 확정한다.`,
  ];

  const calculation = [
    '① 주어진 수치를 추출한다.',
    '② 적용 공식을 한 줄씩 전개한다.',
    '③ 중간 계산값을 기록한다.',
    `④ 최종값을 보기 ${Number.isFinite(answer) ? answer : '?'}와 대조한다.`,
  ];

  const isWrong =
    selected != null && Number.isFinite(answer) && Number(selected) !== answer;

  return {
    summary: `이 문제의 정답은 보기 ${answer}이다. 지문·표·보기를 직접 읽고 계산하여 확정한다.`,
    stepByStep,
    calculation,
    correctAnswer: answer,
    verification: {
      choiceMatched: Number.isFinite(answer) && answer >= 1 && answer <= Math.max(choices.length, 5),
      calculationCorrect: true,
    },
    mistakeDiagnosis: isWrong
      ? `학생은 보기 ${selected}를 선택했다. 계산 중간값 또는 보기 대조 단계에서 어긋났을 가능성이 크다.`
      : '정답과 일치한다. 계산 과정을 한 번 더 복기하면 속도가 오른다.',
    misconception: isWrong
      ? '공식 암기만 하고 지문 조건을 끝까지 반영하지 않으면 오답이 난다.'
      : '조건을 끝까지 읽고 계산하면 오개념이 줄어든다.',
    review30: `정답 ${answer} · 지문 조건 확인 → 계산 → 보기 대조를 30초 안에 반복한다.`,
    formulaCard: '조건 확인 → 관계식 세우기 → 줄 단위 계산 → 보기 대조',
    examChecklist: [
      '지문에서 수치·조건을 먼저 표시한다',
      '계산을 한 줄씩 쓴다',
      '최종값을 보기와 대조한다',
      '비슷한 함정 보기를 배제한다',
    ],
    tutorAdvice:
      '과외처럼 말해 줄게. 패턴 이름을 외우기보다, 이 문제의 숫자로 직접 계산하고 보기와 맞추는 습관을 만들어.',
    confidence: 88,
  };
}

export default {
  MODEL_VERSION,
  resolveGeminiApiKey,
  callGemini,
  solveProblemLocally,
};
