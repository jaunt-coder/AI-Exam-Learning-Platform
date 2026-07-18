/**
 * AI Exam Learning Platform v2
 * UI — DOM 렌더링 유틸리티
 */

/**
 * 요소를 선택한다.
 * @param {string} selector - CSS 선택자
 * @returns {Element|null}
 */
export function $(selector) {
  return document.querySelector(selector);
}

/**
 * 텍스트 콘텐츠를 설정한다.
 * @param {string} selector - CSS 선택자
 * @param {string} text - 표시할 텍스트
 */
export function setText(selector, text) {
  const el = $(selector);
  if (el) el.textContent = text;
}

/**
 * 클래스를 토글한다.
 * @param {string} selector - CSS 선택자
 * @param {string} className - 클래스명
 * @param {boolean} force - 강제 추가/제거
 */
export function toggleClass(selector, className, force) {
  const el = $(selector);
  if (el) el.classList.toggle(className, force);
}

/**
 * 플랫폼 상태 메시지를 표시한다.
 * @param {string} message - 상태 메시지
 * @param {'success'|'error'|'default'} type - 상태 유형
 */
export function showPlatformStatus(message, type = 'default') {
  setText('#status-message', message);

  const statusEl = $('#status-message');
  if (!statusEl) return;

  statusEl.classList.remove('status-value--success', 'status-value--error');

  if (type === 'success') {
    statusEl.classList.add('status-value--success');
  } else if (type === 'error') {
    statusEl.classList.add('status-value--error');
  }
}
