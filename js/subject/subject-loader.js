/**
 * Sprint-19A — Subject Loader
 * Loads subjects/{id}/* plugin files. Falls back to in-memory defaults when fetch fails
 * (file:// / offline). Never writes DB files.
 */

import {
  DEFAULT_SUBJECT_ID,
  SUBJECT_PROMPT_ROLES,
  SUBJECT_FULL_NAMES,
  SUBJECT_LABELS,
  subjectPluginPath,
  normalizeSubjectId,
} from './subject-config.js';
import { hydrateSubjectFromJson, getRegisteredSubject } from './subject-registry.js';

/** @type {Map<string, object>} */
const pluginCache = new Map();

function accountingFormulaDb() {
  return {
    schemaVersion: 'v1',
    subjectId: 'accounting',
    formulas: {
      ACC_INV_001: {
        name: '기말재고 포함 여부',
        formula: '기말재고 = 실사액 ± 소유권 조정(FOB·위탁·적송·시송)',
        when: '기말 현재 소유권이 누구에게 있는지 판단할 때',
      },
      ACC_INV_003: {
        name: '재고 취득원가',
        formula: '재고원가 = 매입가 + 정상 취득·완성 원가 − 비정상낭비·판매비',
        when: '원가 포함/제외 항목을 구분할 때',
      },
      ACC_INV_004: {
        name: '재고 항등식',
        formula: '기초재고 + 당기매입 − 기말재고 = 매출원가',
        when: '매출원가·기말재고·추정 문제를 풀 때',
      },
      ACC_INV_005: {
        name: 'PER vs PR',
        formula: '감모수량 = 장부수량 − 실사수량 · 매출원가(PER) = 판매가능 − 실사기말',
        when: '계속기록법과 실지재고조사법을 비교할 때',
      },
      ACC_INV_006: {
        name: '총평균법 평균단가',
        formula: '평균단가 = (기초원가 + 매입원가) ÷ (기초수량 + 매입수량)',
        when: 'FIFO와 총평균법 매출원가·기말재고를 계산할 때',
      },
      ACC_INV_007: {
        name: '저가법(LCM)',
        formula: '평가액 = min(취득원가, NRV) · NRV = 예상판매가 − 추가비용',
        when: '기말재고를 저가법·소매재고법으로 평가할 때',
      },
    },
    extras: {
      ACC_INV_006: [
        {
          name: 'FIFO 매출원가',
          formula: '매출원가 = 먼저 입고된 원가부터 출고 수량만큼 배분한 합계',
          when: '물가 변동 하에서 FIFO 기말재고·매출원가를 구할 때',
          templateId: 'fifo_avg',
        },
        {
          name: '기말재고·매출원가',
          formula: '기말재고 = 판매가능원가 − 매출원가',
          when: '평균단가 또는 FIFO 출고 후 잔액을 확정할 때',
          templateId: 'fifo_avg',
        },
      ],
    },
  };
}

function skeletonFormulaDb(subjectId) {
  return {
    schemaVersion: 'v1',
    subjectId,
    formulas: {},
    extras: {},
  };
}

function defaultMemoryConfig(subjectId) {
  const id = normalizeSubjectId(subjectId);
  if (id === 'accounting') {
    return {
      schemaVersion: 'v1',
      subjectId: id,
      templates: [
        {
          id: 'fifo_avg_confuse',
          match: { patternIds: ['ACC_INV_006'], mistakeCodes: ['AVG', 'FIFO', 'METHOD'] },
          message: 'FIFO 평균단가와 자주 혼동합니다.',
        },
        {
          id: 'default',
          match: { patternIds: ['*'] },
          messageTemplate: '{patternName}에서 「{label}」를 반복하고 있습니다.',
        },
      ],
      sheetTitle: '30초 암기 Sheet',
      sheetSeconds: 30,
    };
  }
  return {
    schemaVersion: 'v1',
    subjectId: id,
    templates: [
      {
        id: 'default',
        match: { patternIds: ['*'] },
        messageTemplate: '{patternName}에서 「{label}」를 반복하고 있습니다.',
      },
    ],
    sheetTitle: '30초 암기 Sheet',
    sheetSeconds: 30,
  };
}

function defaultPatternConfig(subjectId) {
  const id = normalizeSubjectId(subjectId);
  return {
    schemaVersion: 'v1',
    subjectId: id,
    patternPrefix: id === 'accounting' ? 'ACC_' : `${id.toUpperCase().slice(0, 3)}_`,
    chapters: id === 'accounting' ? ['재고자산'] : [],
    status: id === 'accounting' ? 'active' : 'skeleton',
  };
}

function defaultSubjectJson(subjectId) {
  const id = normalizeSubjectId(subjectId);
  return {
    id,
    name: SUBJECT_FULL_NAMES[id] || id,
    shortName: SUBJECT_LABELS[id] || id,
    examId: 'APPRAISER',
    order: ['accounting', 'economics', 'civil', 'realestate', 'law'].indexOf(id) + 1,
    enabled: true,
    status: id === DEFAULT_SUBJECT_ID ? 'active' : 'skeleton',
    category: id === 'accounting' ? 'calculation' : 'general',
    promptRole: SUBJECT_PROMPT_ROLES[id],
    paths: {
      formulaDb: 'formula-db.json',
      patternConfig: 'pattern-config.json',
      prompt: 'prompt.md',
      memoryConfig: 'memory-config.json',
    },
  };
}

function defaultPromptMd(subjectId) {
  const id = normalizeSubjectId(subjectId);
  const role = SUBJECT_PROMPT_ROLES[id];
  return [
    `# Subject Prompt — ${SUBJECT_FULL_NAMES[id] || id}`,
    '',
    role,
    '',
    '학생은 개념과 풀이 순서를 배우고 있습니다.',
    '반드시 문제 안의 숫자·사실만 사용하세요.',
    '절대로 예시 숫자를 만들지 마세요.',
    'Pattern 일반론보다 실제 풀이가 우선입니다.',
  ].join('\n');
}

function builtinPlugin(subjectId) {
  const id = normalizeSubjectId(subjectId);
  return {
    subjectId: id,
    subject: defaultSubjectJson(id),
    formulaDb: id === 'accounting' ? accountingFormulaDb() : skeletonFormulaDb(id),
    patternConfig: defaultPatternConfig(id),
    promptMd: defaultPromptMd(id),
    memoryConfig: defaultMemoryConfig(id),
    source: 'builtin',
    loadedAt: new Date().toISOString(),
  };
}

async function fetchText(relPath) {
  try {
    const res = await fetch(relPath, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch (_e) {
    return null;
  }
}

async function fetchJson(relPath) {
  const text = await fetchText(relPath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    return null;
  }
}

/**
 * Load a subject plugin (cached).
 * @param {string} subjectId
 * @param {{ force?: boolean }} [opts]
 */
export async function loadSubject(subjectId, opts = {}) {
  const id = normalizeSubjectId(subjectId);
  if (!opts.force && pluginCache.has(id)) {
    return pluginCache.get(id);
  }

  const base = builtinPlugin(id);
  const subjectJson = await fetchJson(subjectPluginPath(id, 'subject.json'));
  const formulaDb = await fetchJson(subjectPluginPath(id, 'formula-db.json'));
  const patternConfig = await fetchJson(subjectPluginPath(id, 'pattern-config.json'));
  const memoryConfig = await fetchJson(subjectPluginPath(id, 'memory-config.json'));
  const promptMd = await fetchText(subjectPluginPath(id, 'prompt.md'));

  const plugin = {
    ...base,
    subject: subjectJson || base.subject,
    formulaDb: formulaDb || base.formulaDb,
    patternConfig: patternConfig || base.patternConfig,
    memoryConfig: memoryConfig || base.memoryConfig,
    promptMd: promptMd || base.promptMd,
    source:
      subjectJson || formulaDb || patternConfig || memoryConfig || promptMd
        ? 'plugin'
        : 'builtin',
    loadedAt: new Date().toISOString(),
  };

  hydrateSubjectFromJson(id, plugin.subject);
  pluginCache.set(id, plugin);
  return plugin;
}

/**
 * Sync accessor — uses cache or builtin defaults (no network).
 * @param {string} subjectId
 */
export function getLoadedSubject(subjectId) {
  const id = normalizeSubjectId(subjectId);
  if (pluginCache.has(id)) return pluginCache.get(id);
  const plugin = builtinPlugin(id);
  hydrateSubjectFromJson(id, plugin.subject);
  pluginCache.set(id, plugin);
  return plugin;
}

/**
 * Prefetch all known subjects.
 */
export async function loadAllSubjects() {
  const ids = ['accounting', 'economics', 'civil', 'realestate', 'law'];
  const results = [];
  for (const id of ids) {
    results.push(await loadSubject(id));
  }
  return results;
}

export function clearSubjectLoaderCache() {
  pluginCache.clear();
}

export function peekSubjectCache(subjectId) {
  return pluginCache.get(normalizeSubjectId(subjectId)) || null;
}

export { getRegisteredSubject };

export default {
  loadSubject,
  getLoadedSubject,
  loadAllSubjects,
  clearSubjectLoaderCache,
  peekSubjectCache,
};
