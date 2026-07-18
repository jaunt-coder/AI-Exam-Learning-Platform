/**
 * AI Exam Learning Platform v2
 * Learning Event Tracking — Phase 7.2
 *
 * LocalStorage learningEvents 기록 · recentStudy 동기화
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { getTodayDateKey } from './recommendation-rules.js';

const LEARNING_EVENTS_VERSION = 1;
const MAX_EVENTS = 500;

/** @type {Map<string, { startedAt: number, patternId: string }>} */
const questionTimers = new Map();

export const EVENT_TYPES = {
  QUESTION_START: 'question_start',
  QUESTION_ANSWER: 'question_answer',
  TUTOR_VIEW: 'tutor_view',
  EXAM_COMPLETE: 'exam_complete',
};

function createEmptyLearningEvents() {
  return { version: LEARNING_EVENTS_VERSION, events: [] };
}

/**
 * learningEvents LocalStorage 읽기
 * @returns {{ version: number, events: array }}
 */
export function loadLearningEvents() {
  const data = getItem(STORAGE_KEYS.LEARNING_EVENTS, null);
  if (!data || typeof data !== 'object') {
    return createEmptyLearningEvents();
  }
  return {
    ...createEmptyLearningEvents(),
    ...data,
    events: Array.isArray(data.events) ? data.events.filter((e) => e && typeof e === 'object') : [],
  };
}

/**
 * learningEvents LocalStorage 저장
 * @param {object} store
 */
export function saveLearningEvents(store) {
  setItem(STORAGE_KEYS.LEARNING_EVENTS, store);
}

function createEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @param {object} params
 */
export function buildLearningEvent({
  type,
  questionId = null,
  patternId = null,
  duration = 0,
  correct = null,
  usedTutor = false,
}) {
  const now = new Date();
  return {
    eventId: createEventId(),
    date: getTodayDateKey(now),
    timestamp: now.toISOString(),
    type,
    questionId,
    patternId,
    duration: Math.max(0, Math.round(Number(duration) || 0)),
    correct: correct === null || correct === undefined ? null : !!correct,
    usedTutor: !!usedTutor,
  };
}

/**
 * recentStudy LocalStorage를 이벤트 duration 기반으로 동기화
 * @param {object} event
 */
export function syncRecentStudyFromEvent(event) {
  const durationSeconds = Number(event.duration) || 0;
  if (durationSeconds <= 0) return;

  const durationMinutes = durationSeconds / 60;
  const raw = getItem(STORAGE_KEYS.RECENT_STUDY, null);

  let sessions = [];
  if (Array.isArray(raw)) {
    sessions = raw.filter((s) => s && typeof s === 'object');
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.sessions)) {
    sessions = raw.sessions.filter((s) => s && typeof s === 'object');
  }

  const existing = sessions.find((s) => s.date === event.date);
  if (existing) {
    existing.durationMinutes = (Number(existing.durationMinutes) || 0) + durationMinutes;
    existing.lastActivityAt = event.timestamp;
  } else {
    sessions.push({
      date: event.date,
      durationMinutes,
      lastActivityAt: event.timestamp,
    });
  }

  sessions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  if (sessions.length > 30) {
    sessions = sessions.slice(0, 30);
  }

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (Number(s.durationMinutes) || 0),
    0,
  );

  setItem(STORAGE_KEYS.RECENT_STUDY, { sessions, totalMinutes });
}

/**
 * @param {object} event
 */
export function appendLearningEvent(event) {
  const store = loadLearningEvents();
  store.events.push(event);
  if (store.events.length > MAX_EVENTS) {
    store.events = store.events.slice(-MAX_EVENTS);
  }
  saveLearningEvents(store);
  syncRecentStudyFromEvent(event);
  return event;
}

/**
 * 문제 풀이 시작
 * @param {object} question
 */
export function trackQuestionStart(question) {
  if (!question?.questionId) return null;

  questionTimers.set(question.questionId, {
    startedAt: Date.now(),
    patternId: question.patternId,
  });

  return appendLearningEvent(
    buildLearningEvent({
      type: EVENT_TYPES.QUESTION_START,
      questionId: question.questionId,
      patternId: question.patternId,
      duration: 0,
    }),
  );
}

/**
 * 답안 제출
 * @param {object} question
 * @param {object} result
 * @param {object} [options]
 */
export function trackQuestionAnswer(question, result, options = {}) {
  if (!question?.questionId) return null;

  let duration = Number(options.durationSeconds);
  if (!Number.isFinite(duration) || duration < 0) {
    const timer = questionTimers.get(question.questionId);
    duration = timer ? Math.round((Date.now() - timer.startedAt) / 1000) : 0;
  }
  questionTimers.delete(question.questionId);

  return appendLearningEvent(
    buildLearningEvent({
      type: EVENT_TYPES.QUESTION_ANSWER,
      questionId: question.questionId,
      patternId: question.patternId,
      duration,
      correct: result?.correct ?? null,
      usedTutor: options.usedTutor ?? false,
    }),
  );
}

/**
 * AI Tutor 확인
 * @param {object} question
 * @param {object} [options]
 */
export function trackTutorView(question, options = {}) {
  if (!question?.questionId) return null;

  return appendLearningEvent(
    buildLearningEvent({
      type: EVENT_TYPES.TUTOR_VIEW,
      questionId: question.questionId,
      patternId: question.patternId,
      duration: Number(options.durationSeconds) || 0,
      usedTutor: true,
    }),
  );
}

/**
 * 모의시험 완료
 * @param {object} session
 * @param {object} analysis
 */
export function trackExamComplete(session, analysis) {
  return appendLearningEvent(
    buildLearningEvent({
      type: EVENT_TYPES.EXAM_COMPLETE,
      questionId: session?.sessionId || null,
      patternId: session?.chapterId || null,
      duration: analysis?.elapsedSeconds ?? 0,
      correct: analysis?.passed ?? null,
      usedTutor: false,
    }),
  );
}

/**
 * @param {array} events
 */
export function computeTotalDurationSeconds(events) {
  if (!Array.isArray(events)) return 0;
  return events.reduce((sum, event) => sum + (Number(event.duration) || 0), 0);
}

/**
 * @param {array} events
 */
export function computeTotalDurationMinutes(events) {
  return Math.round(computeTotalDurationSeconds(events) / 60);
}

/**
 * 날짜별 학습 시간(분)
 * @param {array} events
 */
export function buildDailyStudyMinutes(events) {
  const byDate = {};
  (events || []).forEach((event) => {
    const seconds = Number(event.duration) || 0;
    if (seconds <= 0 || !event.date) return;
    byDate[event.date] = (byDate[event.date] || 0) + seconds / 60;
  });
  return byDate;
}
