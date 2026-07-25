/**
 * Sprint-07 Settings — Cloud Ready badge + Import/Export v4
 * Sprint-09A — Problem Reports dashboard (stats + export only)
 */

import {
  ensureProgress,
  getSyncStatus,
  version,
  setAdapter,
} from '../runtime/sync-service.js';
import { createLocalStorageAdapter } from '../runtime/local-storage-adapter.js';
import {
  createGitHubAdapterInterface,
  createFirebaseAdapterInterface,
} from '../runtime/cloud-adapter-interface.js';
import { mountSyncTransferPanel } from './import-export-v4.js';
import { getItem, STORAGE_KEYS } from './storage.js';
import {
  exportProblemReports,
  getProblemReportStats,
} from './problem-report.js';

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function renderBadge() {
  const st = getSyncStatus();
  const badge = document.getElementById('cloud-badge');
  const detail = document.getElementById('cloud-badge-detail');
  if (badge) {
    badge.textContent = st.label;
    badge.setAttribute('data-status', st.status);
  }
  if (detail) {
    detail.textContent = `Adapter: ${st.adapter} · revision ${st.revision} · sync ${st.sync_version} · 실제 Cloud Sync는 하지 않습니다.`;
  }
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set('sync-adapter', st.adapter);
  set('sync-revision', st.revision);
  set('sync-online', st.online ? 'yes' : 'no');
  set('sync-dirty', st.dirty ? 'yes' : 'no');
}

function renderProblemReportDashboard() {
  const stats = getProblemReportStats();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set('qa-total', stats.total);
  set('qa-open', stats.Open ?? 0);
  set('qa-pending', stats.Pending ?? 0);
  set('qa-closed', stats.Closed ?? 0);
}

function wireProblemReportExport() {
  const status = document.getElementById('qa-export-status');
  const bind = (id, format) => {
    document.getElementById(id)?.addEventListener('click', () => {
      const r = exportProblemReports(format);
      if (status) {
        status.textContent = r.ok
          ? `${r.filename} 내려받기 시작`
          : 'Export 실패';
      }
    });
  };
  bind('qa-export-json', 'json');
  bind('qa-export-md', 'md');
}

function init() {
  applyTheme();
  setAdapter(createLocalStorageAdapter());
  /* Register cloud interfaces so foundation is Cloud Ready (not connected). */
  void createGitHubAdapterInterface();
  void createFirebaseAdapterInterface();
  ensureProgress();

  const ver = version();
  console.info('[Settings] sync foundation', ver);

  mountSyncTransferPanel(document.getElementById('sync-transfer-root'));
  renderBadge();
  renderProblemReportDashboard();
  wireProblemReportExport();

  window.addEventListener('online', renderBadge);
  window.addEventListener('offline', renderBadge);
  setInterval(renderBadge, 5000);
  window.addEventListener('storage', (e) => {
    if (e.key === 'learning.problemReports.v1') renderProblemReportDashboard();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderProblemReportDashboard();
  });
}

init();
