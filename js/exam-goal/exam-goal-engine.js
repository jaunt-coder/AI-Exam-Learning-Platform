/**
 * Sprint-16B — Exam Goal Engine (Orchestrator)
 * Goal management on top of Sprint-16A Strategy Engine (consume only).
 * Never mutates Learning Engine / Recommendation / Mastery / DB / Override.
 */

import { validateExamGoal } from './exam-goal-validator.js';
import {
  calculateDaysRemaining,
  formatDDay,
  calculateScoreGap,
  calculateGoalProgress,
  calculateCompletionRate,
  estimateTaskBudget,
} from './exam-goal-calculator.js';
import {
  evaluateExamPhase,
  resolveGoalPhase,
  PHASE_DISPLAY,
} from './exam-phase-engine.js';
import {
  loadExamGoalDoc,
  persistExamGoal,
  loadExamProgressDoc,
  saveExamProgressDoc,
  loadExamPhaseDoc,
} from './exam-goal-storage.js';
import {
  generateExamStrategy,
  enrichNextProblemsWithStrategy,
} from '../exam-strategy/strategy-engine.js';
import { setExamMode } from '../exam-strategy/exam-advice.js';
import { loadStrategyStateDoc } from '../exam-strategy/strategy-storage.js';

export const EXAM_GOAL_VERSION = '16B';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

/**
 * Save / update exam goal from user input.
 */
export function saveExamGoal(input = {}) {
  const checked = validateExamGoal(input);
  if (!checked.ok) {
    return { ok: false, errors: checked.errors, goal: null };
  }
  const goal = persistExamGoal(checked.normalized);
  /* Sync 16A exam-mode date (consume/set only — no LE change) */
  try {
    setExamMode({ enabled: true, examDate: goal.examDate });
  } catch (_err) {
    /* non-critical */
  }
  evaluateExamPhase(goal.examDate);
  return { ok: true, errors: [], goal };
}

export function getExamGoal() {
  return loadExamGoalDoc();
}

/**
 * Alias kept for Strategy Engine consumers (16A generateExamStrategy).
 */
export function getExamStrategy(input = {}) {
  const goal = loadExamGoalDoc();
  return generateExamStrategy({
    ...input,
    examDate: input.examDate || goal.examDate || null,
    enableExamMode: Boolean(input.examDate || goal.examDate),
  });
}

/**
 * Build today TOP tasks from strategy pack + goal phase.
 */
export function buildTodayMissions(strategy, phaseInfo, goal) {
  const budget = estimateTaskBudget(goal?.availableMinutes || 60);
  const tasks = [];
  const top = strategy?.weaknesses?.[0] || strategy?.topWeakness;
  const second = strategy?.weaknesses?.[1];

  if (phaseInfo?.phase === 'EXAM_READY') {
    tasks.push({
      id: 'mission_memory',
      title: '암기 카드 · 공식 · 실수 목록 확인',
      patternId: null,
      href: 'learning-loop.html',
      completed: false,
    });
    tasks.push({
      id: 'mission_wrong',
      title: '최근 오답 핵심만 재확인',
      patternId: top?.patternId || null,
      href: 'wrong-note.html',
      completed: false,
    });
    tasks.push({
      id: 'mission_rest',
      title: '새 문제 금지 · 컨디션 관리',
      patternId: null,
      href: null,
      completed: false,
    });
  } else {
    if (top) {
      const label = top.label || top.patternId || '약점 Pattern';
      tasks.push({
        id: 'mission_risk',
        title: `${top.patternId || ''} ${label} 복습`.trim(),
        patternId: top.patternId || null,
        href: top.patternId
          ? `question.html?pattern=${encodeURIComponent(top.patternId)}`
          : 'learning-loop.html',
        completed: false,
      });
    }
    tasks.push({
      id: 'mission_retry',
      title: '최근 오답 5문제 재풀이',
      patternId: second?.patternId || top?.patternId || null,
      href: 'wrong-note.html',
      completed: false,
    });
    tasks.push({
      id: 'mission_formula',
      title: '공식 카드 암기',
      patternId: top?.patternId || null,
      href: 'learning-loop.html',
      completed: false,
    });
  }

  return tasks.slice(0, Math.max(3, budget));
}

/**
 * getExamModeStrategy — phase-aware strategy for Dashboard / Result / Tutor.
 */
export function getExamModeStrategy(input = {}) {
  const goal = loadExamGoalDoc();
  const examDate = input.examDate || goal.examDate || null;
  const phaseInfo = evaluateExamPhase(examDate);

  let strategy = null;
  try {
    strategy = generateExamStrategy({
      questions: input.questions || [],
      patterns: input.patterns || [],
      examDate,
      enableExamMode: Boolean(examDate),
    });
  } catch (_err) {
    strategy = loadStrategyStateDoc().latest || null;
  }

  const todayTasks = buildTodayMissions(strategy, phaseInfo, goal);
  const progress = ensureTodayProgress(todayTasks);
  const highRiskCount = (strategy?.riskMap?.list || []).filter(
    (r) => r.risk === 'HIGH' || r.risk === 'CRITICAL',
  ).length;
  const repeatWrong = (strategy?.weaknesses || []).filter((w) => (w.recentWrong || 0) >= 3)
    .length;

  const reason =
    phaseInfo.phase === 'FINAL_STABILIZATION' && repeatWrong > 0
      ? `반복오답 Pattern ${repeatWrong}개 존재`
      : phaseInfo.phase === 'WEAKNESS_REMOVAL' && highRiskCount > 0
        ? `Risk HIGH Pattern ${highRiskCount}개`
        : phaseInfo.priority || phaseInfo.label;

  return {
    schemaVersion: 'v1',
    engineVersion: EXAM_GOAL_VERSION,
    phase: PHASE_DISPLAY[phaseInfo.phase] || phaseInfo.displayPhase || phaseInfo.phase,
    phaseId: phaseInfo.phase,
    phaseLabel: phaseInfo.label,
    priority: phaseInfo.priority,
    reason,
    todayTasks: progress.tasks,
    forbiddenActions: phaseInfo.forbiddenActions || [],
    daysRemaining: phaseInfo.daysRemaining,
    dDay: formatDDay(phaseInfo.daysRemaining),
    goal,
    readiness: strategy?.readiness || null,
    passProbability: strategy?.passProbability ?? strategy?.readiness?.passProbability ?? null,
    strategy,
    riskPatterns: strategy?.dangerTop5 || strategy?.riskMap?.topRisks || [],
    completionRate: calculateCompletionRate(progress.tasks),
    streak: progress.streak,
    learningEngineFormulasUnchanged: true,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Ensure today's progress row exists; merge completed flags.
 */
export function ensureTodayProgress(tasks = []) {
  const doc = loadExamProgressDoc();
  const date = todayKey();
  if (!doc.byDate) doc.byDate = {};
  const existing = doc.byDate[date];

  const mergedTasks = (tasks.length ? tasks : existing?.tasks || []).map((t, i) => {
    const prev = existing?.tasks?.find((x) => x.id === t.id) || existing?.tasks?.[i];
    return {
      ...t,
      completed: Boolean(prev?.completed || t.completed),
    };
  });

  const completed = mergedTasks.filter((t) => t.completed).map((t) => t.id);
  const missed = mergedTasks.filter((t) => !t.completed).map((t) => t.id);
  const completionRate = calculateCompletionRate(mergedTasks);

  doc.byDate[date] = {
    date,
    tasks: mergedTasks,
    completedTasks: completed,
    missedTasks: missed,
    completionRate,
    updatedAt: new Date().toISOString(),
  };

  if (!Number.isFinite(doc.streak)) doc.streak = 0;
  if (!Number.isFinite(doc.longestStreak)) doc.longestStreak = 0;

  saveExamProgressDoc(doc);
  return {
    ...doc.byDate[date],
    streak: doc.streak || 0,
    longestStreak: doc.longestStreak || 0,
  };
}

/**
 * Toggle a today task completed flag + update streak.
 */
export function setTaskCompleted(taskId, completed = true) {
  const doc = loadExamProgressDoc();
  const date = todayKey();
  if (!doc.byDate?.[date]?.tasks) {
    return { ok: false, error: 'no_today_progress' };
  }
  const row = doc.byDate[date];
  row.tasks = row.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: Boolean(completed) } : t,
  );
  row.completedTasks = row.tasks.filter((t) => t.completed).map((t) => t.id);
  row.missedTasks = row.tasks.filter((t) => !t.completed).map((t) => t.id);
  row.completionRate = calculateCompletionRate(row.tasks);
  row.updatedAt = new Date().toISOString();

  const allDone = row.tasks.length > 0 && row.missedTasks.length === 0;
  if (allDone) {
    const y = yesterdayKey();
    const yDone =
      doc.byDate[y]
      && Array.isArray(doc.byDate[y].tasks)
      && doc.byDate[y].tasks.length > 0
      && (doc.byDate[y].missedTasks || []).length === 0;
    if (doc.lastCompletedDate === date) {
      /* already counted today */
    } else if (yDone || doc.lastCompletedDate === y) {
      doc.streak = (Number(doc.streak) || 0) + 1;
    } else {
      doc.streak = 1;
    }
    doc.lastCompletedDate = date;
    doc.longestStreak = Math.max(Number(doc.longestStreak) || 0, doc.streak);
  }

  saveExamProgressDoc(doc);
  return { ok: true, progress: { ...row, streak: doc.streak, longestStreak: doc.longestStreak } };
}

export function getExamProgress() {
  const doc = loadExamProgressDoc();
  const date = todayKey();
  return {
    ...doc,
    today: doc.byDate?.[date] || null,
  };
}

/**
 * Dashboard view-model for Exam Mode cards.
 */
export function buildExamGoalDashboard(input = {}) {
  const mode = getExamModeStrategy(input);
  const goal = mode.goal || {};
  const gap = calculateScoreGap(goal.targetScore, goal.currentScore);
  const goalProgress = calculateGoalProgress(goal.currentScore, goal.targetScore);
  const phaseDoc = loadExamPhaseDoc();

  return {
    examModeCard: {
      dDay: mode.dDay,
      daysRemaining: mode.daysRemaining,
      passProbability: mode.passProbability,
      readinessScore: mode.readiness?.score ?? null,
      targetScore: goal.targetScore,
      currentScore: goal.currentScore,
      subjects: goal.subjects || [],
      todayTop3: (mode.todayTasks || []).slice(0, 3),
      phase: mode.phase,
      phaseLabel: mode.phaseLabel,
    },
    countdown: {
      dDay: mode.dDay,
      daysRemaining: mode.daysRemaining,
      examDate: goal.examDate,
      phase: mode.phase,
    },
    goalProgress: {
      targetScore: goal.targetScore,
      currentScore: goal.currentScore,
      gap,
      progressPct: goalProgress,
      availableMinutes: goal.availableMinutes,
    },
    todayMission: {
      tasks: mode.todayTasks || [],
      completionRate: mode.completionRate,
      forbiddenActions: mode.forbiddenActions || [],
    },
    riskAlert: {
      items: mode.riskPatterns || [],
      highCount: (mode.riskPatterns || []).length,
    },
    completionStreak: {
      streak: mode.streak || 0,
      longestStreak: getExamProgress().longestStreak || 0,
      todayRate: mode.completionRate || 0,
    },
    modeStrategy: mode,
    phase: phaseDoc,
    engineVersion: EXAM_GOAL_VERSION,
  };
}

/**
 * Tutor context enrichment — attach only; do not change tutor generation.
 */
export function buildExamTutorContext(input = {}) {
  const mode = getExamModeStrategy(input);
  return {
    examGoal: mode.goal || null,
    examPhase: {
      phase: mode.phase,
      phaseId: mode.phaseId,
      label: mode.phaseLabel,
      daysRemaining: mode.daysRemaining,
      dDay: mode.dDay,
    },
    riskPatterns: mode.riskPatterns || [],
    todayTasks: mode.todayTasks || [],
    forbiddenActions: mode.forbiddenActions || [],
    tutorGenerationUnchanged: true,
  };
}

/**
 * Result-screen exam strategy perspective line.
 */
export function explainExamStrategyPerspective({
  patternId,
  patternName,
  modeStrategy,
} = {}) {
  const mode = modeStrategy || getExamModeStrategy();
  const days = mode.daysRemaining;
  const dLabel =
    days != null && days > 0 ? `D-${days}` : mode.dDay || mode.phase || 'Exam Mode';
  const pid = patternId || mode.riskPatterns?.[0]?.patternId || '약점 Pattern';
  const name = patternName || mode.riskPatterns?.[0]?.label || pid;

  return {
    title: '시험 전략 관점',
    message: `현재 ${dLabel} 기준, 이 문제는 ${pid} (${name}) 위험도를 낮추기 위해 추천되었습니다.`,
    phase: mode.phase,
    daysRemaining: days,
    patternId: pid,
  };
}

/**
 * Enrich next problems with exam-goal perspective (additive).
 */
export function enrichNextProblemsWithExamGoal(nextProblems, modeStrategy) {
  const mode = modeStrategy || getExamModeStrategy();
  const base = enrichNextProblemsWithStrategy(nextProblems, mode.strategy);
  const items = (base.items || []).map((item) => {
    const perspective = explainExamStrategyPerspective({
      patternId: item.patternId,
      patternName: item.weaknessLabel,
      modeStrategy: mode,
    });
    return {
      ...item,
      examPerspective: perspective,
      why: item.why
        ? { ...item.why, examPerspective: perspective.message }
        : { examPerspective: perspective.message },
    };
  });
  return {
    ...base,
    items,
    examPerspective: items[0]?.examPerspective || null,
  };
}

export default {
  EXAM_GOAL_VERSION,
  saveExamGoal,
  getExamGoal,
  getExamStrategy,
  getExamModeStrategy,
  buildExamGoalDashboard,
  buildExamTutorContext,
  explainExamStrategyPerspective,
  enrichNextProblemsWithExamGoal,
  setTaskCompleted,
  getExamProgress,
  ensureTodayProgress,
  resolveGoalPhase,
  calculateDaysRemaining,
  formatDDay,
};
