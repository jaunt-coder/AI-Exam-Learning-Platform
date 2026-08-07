/**
 * Sprint-07 Settings — Cloud Ready badge + Import/Export v4
 * Sprint-09A — Problem Reports dashboard (stats + export only)
 * Sprint-17D.1 — Gemini AI Config (LocalStorage key management)
 * Sprint-17D.3 — Latest Gemini model + live Connection Test status
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
import {
  loadAiConfig,
  saveAiConfig,
  clearAiConfig,
  maskAiConfig,
  resolveGeminiConnection,
  testGeminiConnection,
  getAiConnectionStatus,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
  GEMINI_API_VERSION,
} from './llm/ai-config.js';
import { listModels } from './llm/model-registry.js';
import { RUNTIME_VERSION } from './llm/runtime/responses-model.js';

function applyTheme() {
  const theme = getItem(STORAGE_KEYS.THEME, 'light') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
}

function setStatus(text, tone = '') {
  const el = document.getElementById('ai-config-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `ll-hint${tone ? ` is-${tone}` : ''}`;
}

function renderAiConfigPanel() {
  const cfg = loadAiConfig();
  const masked = maskAiConfig(cfg);
  const connection = resolveGeminiConnection();
  const status = getAiConnectionStatus();
  const modelEl = document.getElementById('ai-model');
  const keyEl = document.getElementById('ai-api-key');
  const enabledEl = document.getElementById('ai-enabled');
  if (modelEl) modelEl.value = status.model || DEFAULT_GEMINI_MODEL;
  if (keyEl) {
    keyEl.value = '';
    keyEl.placeholder = cfg.apiKey ? '•••• 저장됨 (변경 시 새로 입력)' : 'AIza…';
  }
  if (enabledEl) enabledEl.checked = cfg.enabled !== false;

  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set('ai-current-model', status.model || DEFAULT_GEMINI_MODEL);
  set('ai-current-provider', status.provider || '—');
  set(
    'ai-api-version',
    `${status.apiVersion || GEMINI_API_VERSION} · runtime ${RUNTIME_VERSION}`,
  );
  set(
    'ai-last-connected',
    status.lastConnectedAt
      ? `${status.lastConnectedAt}${status.connected ? '' : ''}`
      : '—',
  );
  set('ai-has-key', masked.hasApiKey ? 'yes' : 'no');
  set('ai-source', connection.source || '—');
  set('ai-updated', cfg.updatedAt || '—');
  set('ai-fallback-model', FALLBACK_GEMINI_MODEL);
  void refreshModelList();
}

async function refreshModelList() {
  const list = document.getElementById('ai-model-list');
  if (!list) return;
  try {
    const res = await listModels({ providerId: 'GEMINI' });
    const models = res.models || [];
    list.innerHTML = models
      .map((id) => `<option value="${String(id).replace(/"/g, '')}"></option>`)
      .join('');
  } catch (_e) {
    list.innerHTML = `<option value="${DEFAULT_GEMINI_MODEL}"></option><option value="${FALLBACK_GEMINI_MODEL}"></option>`;
  }
}

function wireAiConfig() {
  const form = document.getElementById('gemini-config-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const model =
      document.getElementById('ai-model')?.value?.trim() || DEFAULT_GEMINI_MODEL;
    const apiKeyInput = document.getElementById('ai-api-key')?.value?.trim() || '';
    const enabled = Boolean(document.getElementById('ai-enabled')?.checked);
    const patch = { provider: 'GEMINI', model, enabled };
    if (apiKeyInput) patch.apiKey = apiKeyInput;
    const res = saveAiConfig(patch);
    setStatus(res.ok ? '저장 완료 · learning.ai-config.v1' : '저장 실패', res.ok ? 'ok' : 'err');
    renderAiConfigPanel();
  });

  document.getElementById('ai-clear-btn')?.addEventListener('click', () => {
    const ok = window.confirm('저장된 Gemini API Key를 삭제할까요?');
    if (!ok) return;
    clearAiConfig();
    setStatus('API Key 삭제 완료', 'ok');
    renderAiConfigPanel();
  });

  document.getElementById('ai-test-btn')?.addEventListener('click', async () => {
    setStatus('연결 테스트 중… Responses API 호출');
    const model = document.getElementById('ai-model')?.value?.trim();
    const typed = document.getElementById('ai-api-key')?.value?.trim();
    const result = await testGeminiConnection({
      model,
      apiKey: typed || undefined,
    });
    if (result.ok) {
      const fb = result.fallbackUsed
        ? ` · fallback ${result.model}`
        : ` · ${result.model}`;
      setStatus(`Gemini Connected${fb} · HTTP ${result.status}`, 'ok');
    } else if (result.requireSetup) {
      setStatus('Gemini API Key 설정이 필요합니다.', 'err');
    } else {
      setStatus(`API Key Invalid${result.detail ? ` · ${result.detail}` : ''}`, 'err');
    }
    renderAiConfigPanel();
  });
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
  void createGitHubAdapterInterface();
  void createFirebaseAdapterInterface();
  ensureProgress();

  console.info('[Settings] sync foundation', version());

  mountSyncTransferPanel(document.getElementById('sync-transfer-root'));
  renderBadge();
  renderProblemReportDashboard();
  wireProblemReportExport();
  renderAiConfigPanel();
  wireAiConfig();

  window.addEventListener('online', renderBadge);
  window.addEventListener('offline', renderBadge);
  setInterval(renderBadge, 5000);
  window.addEventListener('storage', (e) => {
    if (e.key === 'learning.problemReports.v1') renderProblemReportDashboard();
    if (e.key === 'learning.ai-config.v1') renderAiConfigPanel();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      renderProblemReportDashboard();
      renderAiConfigPanel();
    }
  });
}

init();
