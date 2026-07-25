/**
 * M2.7 Evidence Pad — Learning UX observation storage.
 * LocalStorage: learning.evidence.v1 (append-only log)
 * Draft: learning.evidence.draft.v1 (in-progress form restore)
 * Does NOT analyze, recommend, grade, master, or call LLM.
 * Does NOT modify Question / Answer / Pattern / Attempt SoT.
 */

import { getItem, setItem } from '../js/storage.js';

export const EVIDENCE_STORAGE_KEY = 'learning.evidence.v1';
export const EVIDENCE_DRAFT_KEY = 'learning.evidence.draft.v1';
export const EVIDENCE_SCHEMA = 'learning.evidence.v2';
export const EVIDENCE_TARGET_DEFAULT = 20;
export const PATTERN_TARGET_DEFAULT = 5;

/**
 * @typedef {object} EvidenceRecordV2
 * @property {string} schema_version
 * @property {string} question_id
 * @property {string} pattern_id
 * @property {string|null} attempt_id
 * @property {string|null} session_id
 * @property {number|string|null} student_answer
 * @property {number|string|null} correct_answer
 * @property {boolean|null} is_correct
 * @property {string|null} study_mode
 * @property {string} timestamp
 * @property {string} pattern_understanding
 * @property {string[]} difficulty_reasons
 * @property {string} exam_retry
 * @property {string} explain_friend
 * @property {boolean} want_retry
 * @property {string} memo
 */

export function loadEvidenceLog() {
  const raw = getItem(EVIDENCE_STORAGE_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

/**
 * @param {object} entry
 * @returns {{ ok: boolean, error?: string, record?: EvidenceRecordV2, total?: number }}
 */
export function appendEvidence(entry) {
  try {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'invalid_entry' };
    }
    if (!entry.question_id || !entry.pattern_id) {
      return { ok: false, error: 'missing_ids' };
    }
    if (!entry.pattern_understanding || !entry.exam_retry || !entry.explain_friend) {
      return { ok: false, error: 'missing_required_reflection' };
    }

    const record = {
      schema_version: EVIDENCE_SCHEMA,
      question_id: String(entry.question_id),
      pattern_id: String(entry.pattern_id),
      attempt_id: entry.attempt_id != null ? String(entry.attempt_id) : null,
      session_id: entry.session_id != null ? String(entry.session_id) : null,
      student_answer:
        entry.student_answer === undefined || entry.student_answer === null
          ? null
          : entry.student_answer,
      correct_answer:
        entry.correct_answer === undefined || entry.correct_answer === null
          ? null
          : entry.correct_answer,
      is_correct:
        typeof entry.is_correct === 'boolean'
          ? entry.is_correct
          : typeof entry.correct === 'boolean'
            ? entry.correct
            : null,
      /* WP-02 / WP-15 alias for future consumers */
      correct:
        typeof entry.correct === 'boolean'
          ? entry.correct
          : typeof entry.is_correct === 'boolean'
            ? entry.is_correct
            : null,
      study_mode: entry.study_mode ? String(entry.study_mode) : null,
      timestamp: entry.timestamp || new Date().toISOString(),
      pattern_understanding: String(entry.pattern_understanding),
      difficulty_reasons: Array.isArray(entry.difficulty_reasons)
        ? entry.difficulty_reasons.map(String)
        : [],
      exam_retry: String(entry.exam_retry),
      explain_friend: String(entry.explain_friend),
      want_retry: Boolean(entry.want_retry),
      memo: String(entry.memo || ''),
      future: {
        for_recommendation: true,
        for_coach: true,
        evaluated: false,
        scored: false,
      },
    };

    const log = loadEvidenceLog();
    const next = [...log, record];
    const saved = setItem(EVIDENCE_STORAGE_KEY, next);
    if (!saved) return { ok: false, error: 'storage_write_failed' };
    clearEvidenceDraft(record.question_id);
    return { ok: true, record, total: next.length };
  } catch (err) {
    return { ok: false, error: err?.message || 'append_failed' };
  }
}

export function listEvidence(opts = {}) {
  let log = loadEvidenceLog();
  if (opts.todayOnly) {
    const today = new Date().toISOString().slice(0, 10);
    log = log.filter((e) => String(e.timestamp || '').startsWith(today));
  }
  if (opts.sinceIso) {
    const since = Date.parse(opts.sinceIso);
    if (!Number.isNaN(since)) {
      log = log.filter((e) => Date.parse(e.timestamp) >= since);
    }
  }
  if (opts.sessionId) {
    log = log.filter((e) => e.session_id === opts.sessionId);
  }
  return log;
}

/**
 * Session progress for learner UI (no scoring).
 */
export function getSessionProgress(opts = {}) {
  const evidenceTarget = opts.evidenceTarget ?? EVIDENCE_TARGET_DEFAULT;
  const patternTarget = opts.patternTarget ?? PATTERN_TARGET_DEFAULT;
  const sessionItems = listEvidence({
    sinceIso: opts.sinceIso,
    sessionId: opts.sessionId,
  });
  const patterns = new Set(
    sessionItems.map((e) => e.pattern_id).filter(Boolean)
  );
  return {
    evidenceCount: sessionItems.length,
    evidenceTarget,
    patternCount: patterns.size,
    patternTarget,
    evidenceLabel: `${sessionItems.length} / ${evidenceTarget}`,
    patternLabel: `${patterns.size} / ${patternTarget}`,
  };
}

export function getEvidenceCounts(log = loadEvidenceLog()) {
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = log.filter((e) =>
    String(e.timestamp || '').startsWith(today)
  );
  const byPattern = {};
  for (const e of log) {
    const pid = e.pattern_id || 'unknown';
    byPattern[pid] = (byPattern[pid] || 0) + 1;
  }
  return {
    total: log.length,
    today: todayItems.length,
    byPattern,
  };
}

/** Draft persistence (WP-08) */
export function saveEvidenceDraft(questionId, formState) {
  if (!questionId) return false;
  const bag = getItem(EVIDENCE_DRAFT_KEY, {}) || {};
  bag[questionId] = {
    ...formState,
    savedAt: new Date().toISOString(),
  };
  return setItem(EVIDENCE_DRAFT_KEY, bag);
}

export function loadEvidenceDraft(questionId) {
  if (!questionId) return null;
  const bag = getItem(EVIDENCE_DRAFT_KEY, {}) || {};
  return bag[questionId] || null;
}

export function clearEvidenceDraft(questionId) {
  const bag = getItem(EVIDENCE_DRAFT_KEY, {}) || {};
  if (!questionId) {
    return setItem(EVIDENCE_DRAFT_KEY, {});
  }
  delete bag[questionId];
  return setItem(EVIDENCE_DRAFT_KEY, bag);
}

/**
 * Session package for 07_User_Research_Analyst (WP-05 / WP-10 / WP-14)
 * Includes Attempt · Evidence · Retrieval · Pattern/Session summaries.
 * No AI analysis fields.
 */
export function buildSessionExportPackage(opts = {}) {
  const records = listEvidence({
    sinceIso: opts.sinceIso,
    sessionId: opts.sessionId,
  });
  const attempts = Array.isArray(opts.attempts) ? opts.attempts : [];
  const retrievals = Array.isArray(opts.retrievals) ? opts.retrievals : [];
  const patternsLearned = opts.patternsLearned || [];
  const patternsReviewed = opts.patternsReviewed || [];
  const exportedAt = new Date().toISOString();
  const sessionId =
    opts.sessionId ||
    `session-${exportedAt.slice(0, 10).replaceAll('-', '')}`;

  const patternSummary = {};
  for (const e of records) {
    const pid = e.pattern_id || 'unknown';
    if (!patternSummary[pid]) {
      patternSummary[pid] = {
        pattern_id: pid,
        evidence_count: 0,
        retrieval_count: 0,
      };
    }
    patternSummary[pid].evidence_count += 1;
  }
  for (const r of retrievals) {
    const pid = r.pattern_id || 'unknown';
    if (!patternSummary[pid]) {
      patternSummary[pid] = {
        pattern_id: pid,
        evidence_count: 0,
        retrieval_count: 0,
      };
    }
    patternSummary[pid].retrieval_count += 1;
  }

  const growth = {
    evidence_today: records.length,
    retrieval_today: retrievals.length,
    patterns_learned: patternsLearned,
  };

  return {
    schema: EVIDENCE_SCHEMA,
    export_version: '2.1',
    for_analyst: '07_User_Research_Analyst',
    session_id: sessionId,
    exported_at: exportedAt,
    session_summary: {
      evidence_count: records.length,
      retrieval_count: retrievals.length,
      attempt_count: attempts.length,
      patterns_learned: patternsLearned,
      patterns_reviewed: patternsReviewed,
      study_mode: opts.studyMode || null,
      started_at: opts.sinceIso || null,
    },
    growth_summary: growth,
    pattern_summary: Object.values(patternSummary),
    attempts,
    evidence: records,
    retrieval: retrievals,
  };
}

/**
 * WP-14 Evidence Growth — counts only, no analysis.
 */
export function getEvidenceGrowthSummary(opts = {}) {
  const evidence = listEvidence({
    sinceIso: opts.sinceIso,
    sessionId: opts.sessionId,
    todayOnly: opts.todayOnly,
  });
  const patternIds = [
    ...new Set([
      ...(opts.patternsLearned || []),
      ...evidence.map((e) => e.pattern_id).filter(Boolean),
    ]),
  ];
  return {
    evidence_count: evidence.length,
    pattern_ids: patternIds,
  };
}

export function evidenceToJson(recordsOrPackage) {
  if (recordsOrPackage && recordsOrPackage.export_version) {
    return JSON.stringify(recordsOrPackage, null, 2);
  }
  const records = Array.isArray(recordsOrPackage) ? recordsOrPackage : [];
  return JSON.stringify(
    {
      schema: EVIDENCE_SCHEMA,
      export_version: '2.0',
      for_analyst: '07_User_Research_Analyst',
      exported_at: new Date().toISOString(),
      count: records.length,
      records,
    },
    null,
    2
  );
}

export function evidenceToMarkdown(recordsOrPackage, meta = {}) {
  const isPkg = recordsOrPackage && recordsOrPackage.export_version;
  const pkg = isPkg
    ? recordsOrPackage
    : {
        schema: EVIDENCE_SCHEMA,
        export_version: '2.0',
        session_id: meta.sessionId || 'session',
        exported_at: new Date().toISOString(),
        session_summary: { evidence_count: (recordsOrPackage || []).length },
        pattern_summary: [],
        attempts: [],
        evidence: recordsOrPackage || [],
      };

  const lines = [
    `# ${meta.title || 'Session Evidence Report'}`,
    '',
    `> For: 07_User_Research_Analyst · schema \`${pkg.schema}\` · export v${pkg.export_version}`,
    '',
    `- session_id: \`${pkg.session_id}\``,
    `- exported_at: ${pkg.exported_at}`,
    `- evidence_count: ${pkg.session_summary?.evidence_count ?? pkg.evidence?.length ?? 0}`,
    `- retrieval_count: ${pkg.session_summary?.retrieval_count ?? pkg.retrieval?.length ?? 0}`,
    `- attempt_count: ${pkg.session_summary?.attempt_count ?? pkg.attempts?.length ?? 0}`,
    `- study_mode: ${pkg.session_summary?.study_mode || '—'}`,
    '',
    '## Session Summary',
    '',
    `- patterns_learned: ${(pkg.session_summary?.patterns_learned || []).join(', ') || '—'}`,
    `- patterns_reviewed: ${(pkg.session_summary?.patterns_reviewed || []).join(', ') || '—'}`,
    '',
    '## Growth (counts only · no AI)',
    '',
    `- evidence_today: ${pkg.growth_summary?.evidence_today ?? pkg.session_summary?.evidence_count ?? 0}`,
    `- retrieval_today: ${pkg.growth_summary?.retrieval_today ?? pkg.session_summary?.retrieval_count ?? 0}`,
    `- patterns: ${(pkg.growth_summary?.patterns_learned || pkg.session_summary?.patterns_learned || []).join(', ') || '—'}`,
    '',
    '## Pattern Summary',
    '',
  ];

  const ps = pkg.pattern_summary || [];
  if (!ps.length) lines.push('- (none)');
  else {
    for (const p of ps) {
      lines.push(
        `- \`${p.pattern_id}\` · evidence ${p.evidence_count} · retrieval ${p.retrieval_count ?? 0}`
      );
    }
  }

  lines.push('', '## Retrieval Records', '');
  const rets = pkg.retrieval || [];
  if (!rets.length) lines.push('- (none)', '');
  else {
    rets.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.pattern_id}`);
      lines.push('');
      lines.push(`- question_id: ${r.question_id || '—'}`);
      lines.push(`- attempt_id: ${r.attempt_id || '—'}`);
      lines.push(`- created_at: ${r.created_at}`);
      lines.push(`- prompt: ${r.retrieval_prompt || r.question || '—'}`);
      lines.push(
        `- response: ${r.student_response ? r.student_response.replace(/\n/g, ' ') : '—'}`
      );
      lines.push(`- answered: ${r.answered}`);
      lines.push(`- char_count: ${r.char_count}`);
      lines.push('');
    });
  }

  lines.push('', '## Evidence Records', '');

  (pkg.evidence || []).forEach((e, i) => {
    lines.push(`### ${i + 1}. ${e.question_id}`);
    lines.push('');
    lines.push(`- pattern_id: \`${e.pattern_id}\``);
    lines.push(`- attempt_id: ${e.attempt_id || '—'}`);
    lines.push(`- timestamp: ${e.timestamp}`);
    lines.push(`- study_mode: ${e.study_mode || '—'}`);
    lines.push(`- student_answer: ${e.student_answer ?? '—'}`);
    lines.push(`- correct_answer: ${e.correct_answer ?? '—'}`);
    lines.push(`- is_correct: ${e.is_correct === null || e.is_correct === undefined ? '—' : e.is_correct}`);
    lines.push(`- pattern_understanding: ${e.pattern_understanding || '—'}`);
    lines.push(
      `- difficulty_reasons: ${(e.difficulty_reasons || []).join(', ') || '—'}`
    );
    lines.push(`- exam_retry: ${e.exam_retry || '—'}`);
    lines.push(`- explain_friend: ${e.explain_friend || '—'}`);
    lines.push(`- want_retry: ${e.want_retry ? 'YES' : 'NO'}`);
    lines.push(`- memo: ${e.memo ? e.memo.replace(/\n/g, ' ') : '—'}`);
    lines.push('');
  });

  if ((pkg.attempts || []).length) {
    lines.push('## Attempts (context)', '');
    pkg.attempts.forEach((a, i) => {
      lines.push(
        `${i + 1}. \`${a.event_id || a.attempt_id || '—'}\` · ${a.question_id || '—'} · ${a.result || '—'}`
      );
    });
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function sessionFileStamp(sessionId) {
  if (sessionId && /^session-/.test(sessionId)) return sessionId;
  const d = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `session-${d}`;
}

export default {
  EVIDENCE_STORAGE_KEY,
  EVIDENCE_DRAFT_KEY,
  EVIDENCE_SCHEMA,
  loadEvidenceLog,
  appendEvidence,
  listEvidence,
  getSessionProgress,
  getEvidenceCounts,
  saveEvidenceDraft,
  loadEvidenceDraft,
  clearEvidenceDraft,
  buildSessionExportPackage,
  getEvidenceGrowthSummary,
  evidenceToJson,
  evidenceToMarkdown,
  downloadTextFile,
  sessionFileStamp,
};
