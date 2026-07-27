/**
 * Sprint-16B — Exam Goal Calculator (D-Day, gap, completion)
 * Pure math — does not touch Learning Engine formulas.
 */

/**
 * Days remaining until examDate (local midnight).
 * Positive = future, 0 = today, negative = past.
 */
export function calculateDaysRemaining(examDate) {
  if (!examDate) return null;
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - today.getTime()) / 86400000);
}

export function formatDDay(daysRemaining) {
  if (daysRemaining == null) return 'D-?';
  if (daysRemaining > 0) return `D-${daysRemaining}`;
  if (daysRemaining === 0) return 'D-Day';
  return `D+${Math.abs(daysRemaining)}`;
}

/**
 * Score gap: target − current (can be negative if ahead).
 */
export function calculateScoreGap(targetScore, currentScore) {
  const t = Number(targetScore);
  const c = Number(currentScore);
  if (!Number.isFinite(t) || !Number.isFinite(c)) return null;
  return Math.round(t - c);
}

/**
 * Goal progress 0–100 toward target from a baseline of 0.
 */
export function calculateGoalProgress(currentScore, targetScore) {
  const t = Number(targetScore);
  const c = Number(currentScore);
  if (!Number.isFinite(t) || t <= 0) return 0;
  if (!Number.isFinite(c)) return 0;
  return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
}

/**
 * Daily completion rate from task checklist.
 */
export function calculateCompletionRate(tasks = []) {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t && t.completed).length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * Suggest how many tasks fit available minutes.
 */
export function estimateTaskBudget(availableMinutes, defaultTaskMinutes = 20) {
  const mins = Number(availableMinutes) || 60;
  const unit = Number(defaultTaskMinutes) || 20;
  return Math.max(1, Math.min(5, Math.floor(mins / unit) || 1));
}

export default {
  calculateDaysRemaining,
  formatDDay,
  calculateScoreGap,
  calculateGoalProgress,
  calculateCompletionRate,
  estimateTaskBudget,
};
