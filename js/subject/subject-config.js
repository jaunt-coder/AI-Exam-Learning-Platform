/**
 * Sprint-19A — Subject Adapter Layer: config constants
 * Platform does not hardcode accounting; Accounting is the first Subject Plugin.
 */

export const SUBJECT_ADAPTER_VERSION = '19A';

export const DEFAULT_SUBJECT_ID = 'accounting';

export const SUBJECT_IDS = Object.freeze([
  'accounting',
  'economics',
  'civil',
  'realestate',
  'law',
]);

/** Display labels for Dashboard Subject Switch */
export const SUBJECT_LABELS = Object.freeze({
  accounting: '회계',
  economics: '경제학',
  civil: '민법',
  realestate: '부동산학',
  law: '관계법규',
});

export const SUBJECT_FULL_NAMES = Object.freeze({
  accounting: '회계학',
  economics: '경제학',
  civil: '민법',
  realestate: '부동산학',
  law: '관계법규',
});

export const SUBJECT_PROMPT_ROLES = Object.freeze({
  accounting: '당신은 감정평가사 회계학 강사입니다.',
  economics: '당신은 감정평가사 경제학 강사입니다.',
  civil: '당신은 감정평가사 민법 강사입니다.',
  realestate: '당신은 감정평가사 부동산학 강사입니다.',
  law: '당신은 감정평가사 관계법규 강사입니다.',
});

export const SUBJECT_PLUGIN_FILES = Object.freeze([
  'subject.json',
  'formula-db.json',
  'pattern-config.json',
  'prompt.md',
  'memory-config.json',
]);

/**
 * Relative path from site root to a subject plugin file.
 * @param {string} subjectId
 * @param {string} fileName
 */
export function subjectPluginPath(subjectId, fileName) {
  const id = String(subjectId || DEFAULT_SUBJECT_ID).toLowerCase();
  return `subjects/${id}/${fileName}`;
}

/**
 * @param {string} subjectId
 */
export function isKnownSubjectId(subjectId) {
  return SUBJECT_IDS.includes(String(subjectId || '').toLowerCase());
}

/**
 * Normalize subject id; unknown → default accounting.
 * @param {string} subjectId
 */
export function normalizeSubjectId(subjectId) {
  const id = String(subjectId || '').toLowerCase().trim();
  if (isKnownSubjectId(id)) return id;
  return DEFAULT_SUBJECT_ID;
}

export default {
  SUBJECT_ADAPTER_VERSION,
  DEFAULT_SUBJECT_ID,
  SUBJECT_IDS,
  SUBJECT_LABELS,
  SUBJECT_FULL_NAMES,
  SUBJECT_PROMPT_ROLES,
  SUBJECT_PLUGIN_FILES,
  subjectPluginPath,
  isKnownSubjectId,
  normalizeSubjectId,
};
