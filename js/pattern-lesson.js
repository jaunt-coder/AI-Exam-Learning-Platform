/**
 * M2.2 Pattern Lesson Assembler
 * Assembles Pattern Master screens from EXISTING assets only.
 * Priority: Master → Metadata → pattern-engine → ai-tutor-content templates/profiles
 * Does NOT invent or rewrite educational text.
 */

import {
  PATTERN_DESCRIPTIONS,
  PATTERN_LEARNING_POINTS,
  PATTERN_TRIGGER_KEYWORDS,
  PATTERN_JUDGMENT_CRITERIA,
} from './pattern-engine.js';
import {
  PATTERN_NAMES,
  PATTERN_TUTOR_PROFILES,
} from './ai-tutor-content/pattern-profiles.js';
import { CALCULATION_TEMPLATES } from './ai-tutor-content/calculation-templates.js';

const DISPLAYABLE = new Set(['documented', 'evidenced']);

/**
 * @param {string} patternId
 * @param {Map} masterById
 * @param {Map} metaById
 * @returns {object|null}
 */
export function assemblePatternLesson(patternId, masterById, metaById) {
  if (!patternId) return null;
  const master = masterById.get(patternId);
  if (!master || master.validation_status !== 'verified') return null;

  const meta = metaById.get(patternId) || null;
  const profile = PATTERN_TUTOR_PROFILES[patternId] || null;
  const templateId = profile?.defaultTemplateId || null;
  const template = templateId ? CALCULATION_TEMPLATES[templateId] : null;

  const name =
    master.name || meta?.name || PATTERN_NAMES[patternId] || patternId;

  const conceptMeta = meta?.concept;
  const conceptValue =
    (conceptMeta && DISPLAYABLE.has(conceptMeta.status) && conceptMeta.value) ||
    PATTERN_DESCRIPTIONS[patternId] ||
    profile?.explanation ||
    null;

  const metaSteps =
    meta?.solving_algorithm &&
    DISPLAYABLE.has(meta.solving_algorithm.status) &&
    Array.isArray(meta.solving_algorithm.steps) &&
    meta.solving_algorithm.steps.length
      ? meta.solving_algorithm.steps
      : null;

  // Prefer richest existing mechanical algorithm (template > tutor profile > metadata)
  const algorithmSteps =
    (template?.steps?.length && template.steps) ||
    (profile?.solvingAlgorithm?.length && profile.solvingAlgorithm) ||
    metaSteps ||
    PATTERN_LEARNING_POINTS[patternId] ||
    [];

  const algorithmTitle =
    template?.title || `${name} — 기계적 풀이 절차`;
  const algorithmFormula = template?.formula || null;

  const judgment = PATTERN_JUDGMENT_CRITERIA[patternId] || [];
  const triggers = PATTERN_TRIGGER_KEYWORDS[patternId] || [];
  const learningPoints = PATTERN_LEARNING_POINTS[patternId] || [];

  const checklist = buildChecklist(patternId, triggers, learningPoints, judgment);

  return {
    pattern_id: patternId,
    name,
    grade: meta?.grade ?? master.grade ?? null,
    frequency: meta?.frequency ?? master.frequency ?? null,
    importance: master.importance ?? null,
    validation_status: master.validation_status,
    years: master.years || [],
    preview: {
      overview: PATTERN_DESCRIPTIONS[patternId] || conceptValue,
      learning_goal:
        learningPoints[0] ||
        (conceptValue ? `Pattern「${name}」의 판단 기준을 적용한다.` : null),
      expected_thinking: profile?.examThinking?.[0] || triggers[0]?.cue || null,
      estimated_time:
        master.learning?.estimated_learning_time ||
        estimateTime(algorithmSteps.length),
      keywords: triggers.map((t) => t.keyword),
    },
    introduction: {
      summary: PATTERN_DESCRIPTIONS[patternId] || conceptValue,
      why_tested: profile?.examinerIntent || null,
      examiner_intent: profile?.examinerIntent || null,
      common_misconception:
        profile?.similarTrap ||
        profile?.frequentlyConfusedWith ||
        template?.commonError ||
        null,
      when_appears:
        (master.years && master.years.length
          ? `출제 연도 기록: ${master.years.join(', ')}`
          : null) ||
        (frequencyLabel(meta?.frequency ?? master.frequency)),
    },
    algorithm: {
      title: algorithmTitle,
      formula: algorithmFormula,
      steps: algorithmSteps,
      decision_tree: judgment,
      source:
        template
          ? 'calculation-templates'
          : profile?.solvingAlgorithm
            ? 'pattern-profiles'
            : metaSteps
              ? 'pattern-metadata'
              : 'pattern-learning-points',
    },
    knowhow: {
      exam_first: profile?.examThinking || [],
      memory: profile?.memoryTip || template?.memoryHook || null,
      traps: [
        profile?.similarTrap,
        template?.commonError,
        profile?.frequentlyConfusedWith,
      ].filter(Boolean),
      checkpoints: learningPoints,
    },
    checklist,
    concept: conceptValue,
    related_patterns: profile?.confusedPatterns || [],
    /** Existing profile mistakes only — never inferred per attempt */
    verified_mistakes: collectVerifiedMistakes(profile, template),
    exam_takeaway: buildExamTakeaway(profile, triggers, judgment, learningPoints),
  };
}

function collectVerifiedMistakes(profile, template) {
  const out = [];
  if (profile?.similarTrap) out.push(profile.similarTrap);
  if (template?.commonError) out.push(template.commonError);
  if (profile?.frequentlyConfusedWith) out.push(profile.frequentlyConfusedWith);
  const wr = profile?.wrongReasons;
  if (wr && typeof wr === 'object') {
    for (const text of Object.values(wr)) {
      if (text) out.push(String(text));
    }
  }
  return [...new Set(out.filter(Boolean))];
}

/**
 * Up to 3 exam-room lines from existing assets only (no new prose).
 */
function buildExamTakeaway(profile, triggers, judgment, learningPoints) {
  const lines = [];
  for (const t of profile?.examThinking || []) {
    if (lines.length >= 3) break;
    if (t) lines.push(String(t));
  }
  if (lines.length < 3) {
    for (const t of triggers || []) {
      if (lines.length >= 3) break;
      const line = t.cue
        ? `${t.keyword} — ${t.cue}`
        : t.keyword;
      if (line) lines.push(String(line));
    }
  }
  if (lines.length < 3) {
    for (const j of judgment || []) {
      if (lines.length >= 3) break;
      if (j?.keyword && j?.conclusion) {
        lines.push(`${j.keyword}: ${j.conclusion}`);
      }
    }
  }
  if (lines.length < 3) {
    for (const p of learningPoints || []) {
      if (lines.length >= 3) break;
      if (p) lines.push(String(p));
    }
  }
  return lines.slice(0, 3);
}

function buildChecklist(patternId, triggers, learningPoints, judgment) {
  if (triggers.length) {
    return triggers.map((t) => ({
      id: `${patternId}:${t.keyword}`,
      label: t.keyword,
      hint: t.cue || '',
    }));
  }
  if (judgment.length) {
    return judgment.map((j, i) => ({
      id: `${patternId}:j${i}`,
      label: j.keyword,
      hint: j.criterion || '',
    }));
  }
  return learningPoints.map((p, i) => ({
    id: `${patternId}:lp${i}`,
    label: p,
    hint: '',
  }));
}

function frequencyLabel(freq) {
  if (freq == null) return null;
  return `Pattern Master 기록 빈도: ${freq}`;
}

function estimateTime(stepCount) {
  if (!stepCount) return '약 10–15분';
  if (stepCount <= 3) return '약 10분';
  if (stepCount <= 5) return '약 15분';
  return '약 20분';
}

/**
 * List verified patterns that have at least one golden mapped question.
 */
export function listStudyPatterns(questions, masterById, metaById) {
  const byPattern = new Map();
  for (const q of questions || []) {
    if (q.mapping?.mapping_status !== 'mapped' || !q.mapping.pattern_id) continue;
    const pid = q.mapping.pattern_id;
    const master = masterById.get(pid);
    if (!master || master.validation_status !== 'verified') continue;
    if (!byPattern.has(pid)) byPattern.set(pid, []);
    byPattern.get(pid).push(q);
  }
  return [...byPattern.entries()].map(([patternId, qs]) => ({
    patternId,
    lesson: assemblePatternLesson(patternId, masterById, metaById),
    questions: qs,
  }));
}

export default { assemblePatternLesson, listStudyPatterns };
