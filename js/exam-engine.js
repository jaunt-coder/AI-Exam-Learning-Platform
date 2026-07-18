/**
 * AI Exam Learning Platform v2
 * Exam Simulation Engine — 모의시험 생성·채점·분석 (Phase 6)
 * data/*.json 읽기 전용 · examHistory LocalStorage
 */

import { getItem, setItem, STORAGE_KEYS } from './storage.js';
import { gradeAnswer, recordAttempt } from './question-engine.js';
import { getPatternById } from './data-loader.js';

export const EXAM_HISTORY_VERSION = 1;
export const EXAM_SESSION_STORAGE_KEY = 'examActiveSession';

/** 감정평가사 1차 회계학 — 재고자산 MVP 모의시험 설정 (UI 레이어, DB 미변경) */
export const EXAM_CONFIG = {
  examId: 'APPRAISER',
  subjectId: 'ACC',
  chapterId: 'ACC_INV',
  title: '감정평가사 1차 회계학 — 재고자산 모의시험',
  description:
    '실제 1차 시험과 유사한 시간 제한·랜덤 출제·Pattern별 성취도 분석을 제공합니다. (MVP: 재고자산 32문항 풀)',
  presets: [
    {
      id: 'full',
      label: '전체 모의',
      questionCount: 32,
      timeLimitMinutes: 60,
      description: '32문항 · 60분 (1차 회계학 시험 시간 유사)',
    },
    {
      id: 'standard',
      label: '표준 모의',
      questionCount: 20,
      timeLimitMinutes: 40,
      description: '20문항 랜덤 · 40분',
    },
    {
      id: 'quick',
      label: '단축 모의',
      questionCount: 10,
      timeLimitMinutes: 20,
      description: '10문항 랜덤 · 20분',
    },
  ],
  defaultPresetId: 'standard',
  passScore: 60,
};

function createEmptyExamHistory() {
  return { version: EXAM_HISTORY_VERSION, records: [] };
}

export function loadExamHistory() {
  const data = getItem(STORAGE_KEYS.EXAM_HISTORY, null);
  if (!data || typeof data !== 'object') {
    return createEmptyExamHistory();
  }
  return {
    ...createEmptyExamHistory(),
    ...data,
    records: Array.isArray(data.records) ? data.records : [],
  };
}

export function saveExamHistory(history) {
  setItem(STORAGE_KEYS.EXAM_HISTORY, history);
}

export function getPresetById(presetId) {
  return EXAM_CONFIG.presets.find((p) => p.id === presetId) || EXAM_CONFIG.presets[1];
}

/**
 * Fisher-Yates shuffle (원본 배열 변경 없음)
 * @param {array} array
 */
export function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 챕터 문항에서 랜덤 출제
 * @param {array} questions
 * @param {number} count
 * @param {string} [chapterId]
 */
export function selectRandomQuestions(questions, count, chapterId = EXAM_CONFIG.chapterId) {
  const pool = questions.filter((q) => q.chapterId === chapterId);
  const shuffled = shuffleArray(pool);
  const n = Math.min(count, shuffled.length);
  return shuffled.slice(0, n);
}

/**
 * @param {object} preset
 * @param {array} selectedQuestions
 */
export function createExamSession(preset, selectedQuestions) {
  const now = new Date().toISOString();
  const questionIds = selectedQuestions.map((q) => q.questionId);
  const answers = {};
  questionIds.forEach((id) => {
    answers[id] = null;
  });

  return {
    sessionId: `exam_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    presetId: preset.id,
    presetLabel: preset.label,
    examTitle: EXAM_CONFIG.title,
    chapterId: EXAM_CONFIG.chapterId,
    questionIds,
    answers,
    currentIndex: 0,
    startedAt: now,
    timeLimitSeconds: preset.timeLimitMinutes * 60,
    remainingSeconds: preset.timeLimitMinutes * 60,
    status: 'in_progress',
    timedOut: false,
  };
}

export function saveActiveExamSession(session) {
  try {
    sessionStorage.setItem(EXAM_SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('[Exam] session save failed:', error.message);
    return false;
  }
}

export function loadActiveExamSession() {
  try {
    const raw = sessionStorage.getItem(EXAM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || session.status !== 'in_progress') return null;
    return session;
  } catch {
    return null;
  }
}

export function clearActiveExamSession() {
  try {
    sessionStorage.removeItem(EXAM_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} session
 * @param {string} questionId
 * @param {number|null} selectedAnswer
 */
export function saveExamAnswer(session, questionId, selectedAnswer) {
  if (!session.answers || !(questionId in session.answers)) return session;
  session.answers[questionId] = selectedAnswer;
  saveActiveExamSession(session);
  return session;
}

export function getAnsweredCount(session) {
  return Object.values(session.answers || {}).filter((v) => v !== null && v !== undefined).length;
}

export function formatExamTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAchievementLevel(accuracy) {
  if (accuracy >= 90) return { level: 'EXCELLENT', label: '우수' };
  if (accuracy >= 70) return { level: 'GOOD', label: '양호' };
  if (accuracy >= 50) return { level: 'FAIR', label: '보통' };
  return { level: 'WEAK', label: '취약' };
}

/**
 * 시험 채점 및 Pattern 분석
 * @param {object} session
 * @param {array} questions
 * @param {array} patterns
 */
export function gradeExamSession(session, questions, patterns) {
  const questionMap = Object.fromEntries(questions.map((q) => [q.questionId, q]));
  const details = [];
  const patternBuckets = {};

  session.questionIds.forEach((qid) => {
    const question = questionMap[qid];
    if (!question) return;

    const selected = session.answers[qid];
    const answered = selected !== null && selected !== undefined;
    const result = answered
      ? gradeAnswer(question, Number(selected))
      : { correct: false, selectedAnswer: null, correctAnswer: Number(question.answer) };

    details.push({
      questionId: qid,
      patternId: question.patternId,
      year: question.year,
      answered,
      ...result,
    });

    if (!patternBuckets[question.patternId]) {
      patternBuckets[question.patternId] = { total: 0, correct: 0, answered: 0 };
    }
    patternBuckets[question.patternId].total += 1;
    if (answered) patternBuckets[question.patternId].answered += 1;
    if (result.correct) patternBuckets[question.patternId].correct += 1;
  });

  const totalQuestions = session.questionIds.length;
  const answeredCount = details.filter((d) => d.answered).length;
  const correctCount = details.filter((d) => d.correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;
  const totalScore = Math.round((correctCount / totalQuestions) * 100);

  const patternStats = Object.entries(patternBuckets)
    .map(([patternId, bucket]) => {
      const pattern = getPatternById(patterns, patternId);
      const rate =
        bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 1000) / 10 : 0;
      const achievement = getAchievementLevel(rate);
      return {
        patternId,
        patternName: pattern?.name || patternId,
        grade: pattern?.grade || '-',
        frequency: pattern?.frequency || 0,
        total: bucket.total,
        answered: bucket.answered,
        correct: bucket.correct,
        accuracy: rate,
        achievementLevel: achievement.level,
        achievementLabel: achievement.label,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakPatterns = patternStats
    .filter((p) => p.accuracy < 70 || p.correct < p.total)
    .slice(0, 5)
    .map((p) => ({
      patternId: p.patternId,
      patternName: p.patternName,
      accuracy: p.accuracy,
      reason:
        p.accuracy < 50
          ? '정답률 50% 미만 — 집중 복습 필요'
          : p.accuracy < 70
            ? '정답률 70% 미만 — 취약 Pattern'
            : '일부 오답 — 개념 재확인 권장',
    }));

  const recommendations = buildExamRecommendations({
    totalScore,
    accuracy,
    weakPatterns,
    patternStats,
    unansweredCount: totalQuestions - answeredCount,
  });

  return {
    sessionId: session.sessionId,
    totalQuestions,
    answeredCount,
    correctCount,
    unansweredCount: totalQuestions - answeredCount,
    totalScore,
    maxScore: 100,
    accuracy,
    passed: totalScore >= EXAM_CONFIG.passScore,
    elapsedSeconds: session.timeLimitSeconds - session.remainingSeconds,
    timedOut: !!session.timedOut,
    details,
    patternStats,
    weakPatterns,
    recommendations,
  };
}

function buildExamRecommendations({ totalScore, weakPatterns, patternStats, unansweredCount }) {
  const recs = [];

  if (unansweredCount > 0) {
    recs.push({
      type: 'time',
      title: '시간 관리 연습',
      description: `${unansweredCount}문항 미응답 — 모의시험에서 전 문항 답안 작성 연습을 권장합니다.`,
      href: 'exam.html',
    });
  }

  weakPatterns.slice(0, 3).forEach((wp) => {
    recs.push({
      type: 'pattern',
      title: `${wp.patternName} Pattern 복습`,
      description: wp.reason,
      href: `pattern.html?pattern=${encodeURIComponent(wp.patternId)}`,
    });
  });

  if (totalScore < EXAM_CONFIG.passScore) {
    recs.push({
      type: 'wrong-note',
      title: '오답 노트 집중 복습',
      description: '합격 기준(60점) 미달 — 틀린 문항을 오답 노트에서 반복 학습하세요.',
      href: 'wrong-note.html',
    });
    recs.push({
      type: 'ai-tutor',
      title: 'AI Tutor 맞춤 설명',
      description: '오답 Pattern에 대해 AI 과외 설명으로 개념을 정리하세요.',
      href: 'ai-tutor.html',
    });
  } else {
    const topWeak = patternStats.find((p) => p.accuracy < 100);
    if (topWeak) {
      recs.push({
        type: 'question',
        title: `${topWeak.patternName} 기출 추가 풀이`,
        description: '합격 점수 달성 — 남은 취약 Pattern 기출을 추가로 풀어보세요.',
        href: `question.html?pattern=${encodeURIComponent(topWeak.patternId)}`,
      });
    }
  }

  return recs;
}

/**
 * 시험 제출 — examHistory 저장, progress/wrongAnswers 반영
 * @param {object} session
 * @param {object} analysis
 * @param {array} questions
 */
export function submitExamSession(session, analysis, questions) {
  const questionMap = Object.fromEntries(questions.map((q) => [q.questionId, q]));

  analysis.details.forEach((detail) => {
    if (!detail.answered) return;
    const question = questionMap[detail.questionId];
    if (!question) return;
    recordAttempt(question, {
      correct: detail.correct,
      selectedAnswer: detail.selectedAnswer,
      correctAnswer: detail.correctAnswer,
    });
  });

  const record = {
    sessionId: session.sessionId,
    presetId: session.presetId,
    presetLabel: session.presetLabel,
    examTitle: session.examTitle,
    chapterId: session.chapterId,
    startedAt: session.startedAt,
    submittedAt: new Date().toISOString(),
    timeLimitSeconds: session.timeLimitSeconds,
    elapsedSeconds: analysis.elapsedSeconds,
    timedOut: analysis.timedOut,
    questionIds: session.questionIds,
    answers: session.answers,
    summary: {
      totalQuestions: analysis.totalQuestions,
      answeredCount: analysis.answeredCount,
      correctCount: analysis.correctCount,
      totalScore: analysis.totalScore,
      maxScore: analysis.maxScore,
      accuracy: analysis.accuracy,
      passed: analysis.passed,
    },
    patternStats: analysis.patternStats,
    weakPatterns: analysis.weakPatterns,
    recommendations: analysis.recommendations,
  };

  const history = loadExamHistory();
  history.records.unshift(record);
  if (history.records.length > 20) {
    history.records = history.records.slice(0, 20);
  }
  saveExamHistory(history);

  session.status = 'submitted';
  clearActiveExamSession();

  return record;
}

export function getLatestExamRecord() {
  const history = loadExamHistory();
  return history.records[0] || null;
}

export function getExamHistorySummary() {
  const history = loadExamHistory();
  if (!history.records.length) {
    return { count: 0, averageScore: null, bestScore: null, lastScore: null };
  }
  const scores = history.records.map((r) => r.summary?.totalScore ?? 0);
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    count: history.records.length,
    averageScore: Math.round(sum / scores.length),
    bestScore: Math.max(...scores),
    lastScore: scores[0],
  };
}
