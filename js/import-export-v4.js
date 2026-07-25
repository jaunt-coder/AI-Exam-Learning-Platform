/**
 * Sprint-07 Export / Import v4 — sync-state.json
 * Multi-device foundation via file transfer (Cloud push not implemented).
 */

import {
  downloadTextFile,
  sessionFileStamp,
} from '../runtime/evidence-service.js';
import {
  load as syncLoad,
  merge as syncMerge,
  detectConflicts,
  loadMeta,
  touchLocal,
  SYNC_SCHEMA,
  SYNC_VERSION,
  getSyncStatus,
  ensureProgress,
} from '../runtime/sync-service.js';
import { setItem } from './storage.js';

const EXPORT_VERSION = '4.0';
const PACKAGE_SCHEMA = 'learning.sync-state.v4';

/**
 * Build sync-state.json package (v4).
 * @returns {Promise<object>}
 */
export async function buildSyncStatePackage() {
  ensureProgress();
  const loaded = await syncLoad();
  if (!loaded.ok) {
    throw new Error(loaded.error || 'sync_load_failed');
  }
  const meta = loadMeta();
  const status = getSyncStatus();
  return {
    schema: PACKAGE_SCHEMA,
    export_version: EXPORT_VERSION,
    sync_schema: SYNC_SCHEMA,
    sync_version: SYNC_VERSION,
    for: 'multi_device_study_state',
    created_at: new Date().toISOString(),
    revision: meta.revision || 0,
    status,
    study_state: loaded.bundle.keys,
    integrity: {
      question_db: 'unchanged',
      answer_db: 'unchanged',
      pattern_db: 'unchanged',
      knowledge_db: 'unchanged',
      note: 'Student state only — SoT DBs are never included',
    },
  };
}

/**
 * Download sync-state.json
 * @returns {Promise<{ ok: boolean, filename?: string, error?: string }>}
 */
export async function exportSyncStateV4() {
  try {
    const pkg = await buildSyncStatePackage();
    const stamp = sessionFileStamp(
      `session-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`
    );
    const filename = `${stamp}-sync-state.json`;
    downloadTextFile(
      filename,
      JSON.stringify(pkg, null, 2),
      'application/json;charset=utf-8'
    );
    const meta = loadMeta();
    setItem('learning.sync.meta.v1', {
      ...meta,
      dirty: false,
      last_export_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { ok: true, filename };
  } catch (err) {
    return { ok: false, error: err?.message || 'export_failed' };
  }
}

/**
 * Import sync-state.json object or parsed JSON string.
 * @param {object|string} input
 * @returns {{ ok: boolean, conflicts?: object[], error?: string }}
 */
export function importSyncStateV4(input) {
  try {
    const pkg = typeof input === 'string' ? JSON.parse(input) : input;
    if (!pkg || typeof pkg !== 'object') {
      return { ok: false, error: 'invalid_json' };
    }
    if (
      pkg.schema &&
      pkg.schema !== PACKAGE_SCHEMA &&
      !pkg.study_state &&
      !pkg.keys
    ) {
      return { ok: false, error: 'unsupported_schema' };
    }

    const preview = detectConflicts(pkg);
    const result = syncMerge(pkg);
    if (!result.ok) return result;

    touchLocal();
    const meta = loadMeta();
    setItem('learning.sync.meta.v1', {
      ...meta,
      dirty: false,
      last_import_at: new Date().toISOString(),
    });

    return {
      ok: true,
      conflicts: result.conflicts || preview.conflicts || [],
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'import_failed' };
  }
}

/**
 * Wire file input → import.
 * @param {HTMLInputElement} fileInput
 * @param {{ onDone?: (r: object) => void, onError?: (e: string) => void }} [cb]
 */
export function bindImportFileInput(fileInput, cb = {}) {
  if (!fileInput) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importSyncStateV4(text);
      if (!result.ok) cb.onError?.(result.error || 'import_failed');
      else cb.onDone?.(result);
    } catch (err) {
      cb.onError?.(err?.message || 'read_failed');
    } finally {
      fileInput.value = '';
    }
  });
}

/**
 * Mount compact Export/Import controls.
 * @param {HTMLElement} host
 */
export function mountSyncTransferPanel(host) {
  if (!host) return;
  host.innerHTML = `
    <div class="sync-transfer">
      <p class="sync-transfer__title">기기 간 학습 상태 이동</p>
      <p class="sync-transfer__desc">sync-state.json을 Export한 뒤 다른 기기에서 Import하세요. Cloud 자동 동기화는 아직 없습니다.</p>
      <div class="ll-actions">
        <button type="button" class="button button--primary" data-sync-export>Export sync-state.json</button>
        <label class="button button--ghost sync-import-label">
          Import sync-state.json
          <input type="file" accept="application/json,.json" data-sync-import hidden />
        </label>
      </div>
      <p class="ll-hint" data-sync-transfer-status role="status"></p>
    </div>
  `;
  const status = host.querySelector('[data-sync-transfer-status]');
  host.querySelector('[data-sync-export]')?.addEventListener('click', async () => {
    const r = await exportSyncStateV4();
    if (status) {
      status.textContent = r.ok
        ? `${r.filename} 내려받기 완료`
        : `Export 실패: ${r.error}`;
    }
  });
  bindImportFileInput(host.querySelector('[data-sync-import]'), {
    onDone(r) {
      if (status) {
        const n = r.conflicts?.length || 0;
        status.textContent =
          n > 0
            ? `Import 성공 · 충돌 ${n}건을 정책에 따라 병합했습니다. 페이지를 새로고침하세요.`
            : 'Import 성공 · 페이지를 새로고침하세요.';
      }
    },
    onError(e) {
      if (status) status.textContent = `Import 실패: ${e}`;
    },
  });
}

export default {
  buildSyncStatePackage,
  exportSyncStateV4,
  importSyncStateV4,
  bindImportFileInput,
  mountSyncTransferPanel,
};
