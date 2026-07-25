/**
 * AI Exam Learning Platform v2
 * Storage — LocalStorage 관리
 */

const STORAGE_KEYS = {
  PROGRESS: 'progress',
  WRONG_ANSWERS: 'wrongAnswers',
  BOOKMARKS: 'bookmarks',
  RECENT_STUDY: 'recentStudy',
  LEARNING_EVENTS: 'learningEvents',
  THEME: 'theme',
  SETTINGS: 'settings',
  EXAM_HISTORY: 'examHistory',
  // Coach Agent Layer (additive — do not rename existing keys)
  USER_PROFILE: 'userProfile',
  QUESTION_ATTEMPTS: 'questionAttempts',
  WEAKNESS_REPORTS: 'weaknessReports',
  // Phase C2 append-only attempts (does not replace legacy keys)
  COACH_ATTEMPTS_V1: 'coach.attempts.v1',
  // Phase C3 weakness diagnosis snapshot
  COACH_WEAKNESS_V1: 'coach.weakness.v1',
  // M1 Learning Loop (additive — do not rename existing Constitution keys)
  LEARNING_ATTEMPTS_V1: 'learning.attempts.v1',
  LEARNING_STATE_V1: 'learning.state.v1',
  // Sprint-09K Pattern Mastery runtime (additive — do not rename)
  LEARNING_MASTERY_V1: 'learning.mastery.v1',
  // M2.6 Evidence Pad (append-only observation log — do not rename)
  LEARNING_EVIDENCE_V1: 'learning.evidence.v1',
  // Sprint-07 Study State Sync (additive — do not rename)
  LEARNING_SESSION_V1: 'learning.session.v1',
  LEARNING_RETRIEVAL_V1: 'learning.retrieval.v1',
  LEARNING_PROGRESS_V1: 'learning.progress.v1',
  LEARNING_SYNC_META_V1: 'learning.sync.meta.v1',
};

/**
 * LocalStorage에서 JSON 데이터를 안전하게 읽는다.
 * @param {string} key - Storage key
 * @param {*} defaultValue - 기본값
 * @returns {*}
 */
export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[Storage] Failed to read key "${key}":`, error.message);
    return defaultValue;
  }
}

/**
 * LocalStorage에 JSON 데이터를 안전하게 저장한다.
 * @param {string} key - Storage key
 * @param {*} value - 저장할 값
 * @returns {boolean}
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to write key "${key}":`, error.message);
    return false;
  }
}

/**
 * LocalStorage에서 항목을 제거한다.
 * @param {string} key - Storage key
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove key "${key}":`, error.message);
  }
}

/**
 * 등록된 Storage Key 목록을 반환한다.
 * @returns {object}
 */
export function getStorageKeys() {
  return { ...STORAGE_KEYS };
}

export { STORAGE_KEYS };
