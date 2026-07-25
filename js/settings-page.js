/**
 * Sprint-07 Settings — Cloud Ready badge + Import/Export v4
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

  window.addEventListener('online', renderBadge);
  window.addEventListener('offline', renderBadge);
  setInterval(renderBadge, 5000);
}

init();
