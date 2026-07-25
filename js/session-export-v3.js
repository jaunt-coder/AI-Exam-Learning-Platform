/**
 * Sprint-06 Session Export v3 — Presentation Layer only.
 * Assembles multi-Pattern session package. Does not mutate Evidence/DB.
 */

import {
  listEvidence,
  downloadTextFile,
  sessionFileStamp,
} from '../runtime/evidence-service.js';

const SCHEMA = 'learning.session.v3';
const EXPORT_VERSION = '3.0';

/**
 * @param {object} opts
 * @param {string} opts.sessionId
 * @param {number|string} opts.startedAt — ms or ISO
 * @param {number|string} [opts.finishedAt]
 * @param {string[]} [opts.patternsLearned]
 * @param {string[]} [opts.patternsReviewed]
 * @param {Array<{pattern_id:string,name?:string}>} [opts.patternMeta]
 * @param {object[]} [opts.attempts]
 * @param {object[]} [opts.retrievals]
 * @param {string} [opts.studyMode]
 */
export function buildSessionExportV3(opts = {}) {
  const startedMs = toMs(opts.startedAt) || Date.now();
  const finishedMs = toMs(opts.finishedAt) || Date.now();
  const sinceIso = new Date(startedMs).toISOString();
  const createdAt = sinceIso;
  const exportedAt = new Date().toISOString();
  const sessionId =
    opts.sessionId ||
    `session-${createdAt.slice(0, 10).replaceAll('-', '')}`;

  const evidence = listEvidence({
    sinceIso,
    sessionId: opts.sessionId,
  });
  const retrievals = Array.isArray(opts.retrievals) ? opts.retrievals : [];
  const attempts = Array.isArray(opts.attempts) ? opts.attempts : [];
  const learned = opts.patternsLearned || [];
  const reviewed = opts.patternsReviewed || [];
  const metaById = new Map(
    (opts.patternMeta || []).map((p) => [p.pattern_id, p])
  );

  const patternIds = [
    ...new Set([...learned, ...reviewed, ...evidence.map((e) => e.pattern_id)]),
  ].filter(Boolean);

  const patterns = patternIds.map((pid) => {
    const meta = metaById.get(pid);
    return {
      pattern_id: pid,
      name: meta?.name || pid,
      learned: learned.includes(pid),
      reviewed: reviewed.includes(pid),
    };
  });

  const questions = attempts.map((a) => ({
    question_id: a.question_id || a.questionId || null,
    pattern_id: a.pattern_id || a.patternId || null,
    result: a.result || a.grade?.result || null,
    timestamp: a.timestamp || a.created_at || null,
  }));

  const durationMs = Math.max(0, finishedMs - startedMs);

  return {
    schema: SCHEMA,
    export_version: EXPORT_VERSION,
    for_analyst: '07_User_Research_Analyst',
    session_id: sessionId.startsWith('session-')
      ? sessionId
      : `session-${sessionId}`,
    created_at: createdAt,
    exported_at: exportedAt,
    duration_ms: durationMs,
    duration_minutes: Math.round(durationMs / 60000),
    patterns,
    questions,
    retrievals,
    evidence,
    summary: {
      pattern_count: patterns.filter((p) => p.learned).length || patterns.length,
      question_count: new Set(
        questions.map((q) => q.question_id).filter(Boolean)
      ).size,
      evidence_count: evidence.length,
      retrieval_count: retrievals.length,
      study_mode: opts.studyMode || null,
    },
  };
}

export function sessionPackageToJson(pkg) {
  return JSON.stringify(pkg, null, 2);
}

export function sessionPackageToMarkdown(pkg) {
  const learned = (pkg.patterns || []).filter((p) => p.learned);
  const patternLines = (pkg.patterns || []).length
    ? (pkg.patterns || []).map(
        (p) =>
          `- ${p.learned ? '✓' : '·'} ${p.name || p.pattern_id} (\`${p.pattern_id}\`)`
      )
    : ['- (none)'];

  const qIds = [
    ...new Set((pkg.questions || []).map((q) => q.question_id).filter(Boolean)),
  ];

  const lines = [
    '# 오늘 공부 요약',
    '',
    `> For: 07_User_Research_Analyst · schema \`${pkg.schema}\` · export v${pkg.export_version}`,
    '',
    `- session_id: \`${pkg.session_id}\``,
    `- created_at: ${pkg.created_at}`,
    `- exported_at: ${pkg.exported_at}`,
    `- duration: ${pkg.duration_minutes}분 (${pkg.duration_ms}ms)`,
    `- study_mode: ${pkg.summary?.study_mode || '—'}`,
    '',
    '## Pattern',
    '',
    `- count: ${pkg.summary?.pattern_count ?? learned.length}`,
    ...patternLines,
    '',
    '## Question',
    '',
    `- count: ${pkg.summary?.question_count ?? qIds.length}`,
    ...(qIds.length ? qIds.map((id) => `- \`${id}\``) : ['- (none)']),
    '',
    '## Evidence',
    '',
    `- count: ${pkg.summary?.evidence_count ?? pkg.evidence?.length ?? 0}`,
    '',
  ];

  (pkg.evidence || []).forEach((e, i) => {
    lines.push(`### ${i + 1}. ${e.question_id}`);
    lines.push('');
    lines.push(`- pattern_id: \`${e.pattern_id}\``);
    lines.push(`- timestamp: ${e.timestamp}`);
    lines.push(`- pattern_understanding: ${e.pattern_understanding || '—'}`);
    lines.push(`- memo: ${e.memo ? String(e.memo).replace(/\n/g, ' ') : '—'}`);
    lines.push('');
  });

  lines.push('## Retrieval', '');
  lines.push(
    `- count: ${pkg.summary?.retrieval_count ?? pkg.retrievals?.length ?? 0}`,
    ''
  );

  (pkg.retrievals || []).forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.pattern_id}`);
    lines.push('');
    lines.push(`- question_id: ${r.question_id || '—'}`);
    lines.push(`- created_at: ${r.created_at}`);
    lines.push(
      `- response: ${
        r.student_response
          ? String(r.student_response).replace(/\n/g, ' ')
          : '—'
      }`
    );
    lines.push('');
  });

  lines.push('## Today\'s Reflection', '');
  lines.push('- AI 분석·점수·Mastery 없음.');
  lines.push('- Evidence memo와 이해도 선택만 원문 보존.');
  const memos = (pkg.evidence || [])
    .map((e) => (e.memo || '').trim())
    .filter(Boolean);
  if (!memos.length) lines.push('- (메모 없음)');
  else memos.forEach((m, i) => lines.push(`${i + 1}. ${m.replace(/\n/g, ' ')}`));
  lines.push('');

  return lines.join('\n');
}

/**
 * @param {'json'|'md'} format
 * @param {object} opts — same as buildSessionExportV3
 */
export function exportSessionV3(format, opts = {}) {
  const pkg = buildSessionExportV3(opts);
  const stamp = sessionFileStamp(pkg.session_id);
  if (format === 'json') {
    downloadTextFile(
      `${stamp}.json`,
      sessionPackageToJson(pkg),
      'application/json;charset=utf-8'
    );
  } else {
    downloadTextFile(
      `${stamp}.md`,
      sessionPackageToMarkdown(pkg),
      'text/markdown;charset=utf-8'
    );
  }
  return pkg;
}

function toMs(v) {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

export default {
  buildSessionExportV3,
  sessionPackageToJson,
  sessionPackageToMarkdown,
  exportSessionV3,
};
