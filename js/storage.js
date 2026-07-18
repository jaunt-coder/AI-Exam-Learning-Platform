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
  EXAM_HISTORY: 'examHistory'
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
