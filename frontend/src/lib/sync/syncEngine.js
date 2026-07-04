import { localDb } from './localDb';
import { api } from '../api';

const TABLES = [
  'user', 'role', 'clinic', 'department', 'expense', 'patient', 'patientFile',
  'appointment', 'icd10Code', 'vitalSign', 'symptom', 'medication',
  'clinicalRecord', 'referral', 'referralMedication', 'referralTest', 'surgery',
  'inventoryItem', 'inventoryLocation', 'inventoryTransaction', 'transaction',
  'shift', 'diagnosticTest', 'diagnosticPanel', 'diagnosticPanelTest',
  'diagnosticOrder', 'diagnosticOrderTest', 'employee', 'payrollRecord',
  'attendance', 'leaveRequest', 'auditLog', 'accountsPayable', 'supplier',
  'supplierInvoice', 'supplierInvoiceItem', 'costCenter', 'requisition',
  'requisitionItem', 'purchaseOrder', 'purchaseOrderItem', 'fixedAsset',
  'notification',
];

const SYNC_STATE_KEY = 'sync_state';
const PENDING_MUTATIONS_KEY = 'pending_mutations';
const INITIAL_SYNC_KEY = 'initial_sync_done';

const listeners = new Set();

function notify(state) {
  for (const fn of listeners) fn(state);
}

let syncState = { status: 'idle', lastSyncAt: null, error: null };
let syncPromise = null;

async function isOnline() {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    await fetch('/api/health', { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

function getOnlineStatus() {
  return navigator.onLine;
}

let autoSyncTimer = null;

export const syncEngine = {
  subscribe(fn) {
    listeners.add(fn);
    fn(syncState);
    return () => listeners.delete(fn);
  },
  getState() {
    return syncState;
  },
  async init(force = false) {
    if (syncPromise && !force) return syncPromise;
    const alreadyDone = await localDb.getMeta(INITIAL_SYNC_KEY);
    if (alreadyDone && !force) return;
    syncPromise = this.initialSync(force);
    const result = await syncPromise;
    if (getOnlineStatus()) this.startAutoSync();
    return result;
  },
  async initialSync(force = false) {
    const alreadyDone = !force && (await localDb.getMeta(INITIAL_SYNC_KEY));
    if (alreadyDone) return;
    syncState = { ...syncState, status: 'syncing' };
    notify(syncState);
    try {
      localDb.registerTables(TABLES);
      const res = await api.get('/sync/initial');
      for (const [table, records] of Object.entries(res.data)) {
        if (records.length > 0) {
          await localDb.putMany(table, records);
        }
      }
      const now = new Date().toISOString();
      await localDb.setMeta(INITIAL_SYNC_KEY, now);
      await localDb.setMeta(SYNC_STATE_KEY, now);
      syncState = { status: 'idle', lastSyncAt: now, error: null, pendingMutations: 0 };
      notify(syncState);
    } catch (err) {
      syncState = { status: 'error', lastSyncAt: null, error: err.message, pendingMutations: 0 };
      notify(syncState);
    }
  },
  async pull() {
    const since = await localDb.getMeta(SYNC_STATE_KEY) || '2020-01-01T00:00:00Z';
    syncState = { ...syncState, status: 'syncing' };
    notify(syncState);
    try {
      const res = await api.get(`/sync/pull?since=${encodeURIComponent(since)}`);
      for (const [table, records] of Object.entries(res.changes)) {
        if (records.length > 0) {
          await localDb.putMany(table, records);
        }
      }
      const now = res.timestamp || new Date().toISOString();
      await localDb.setMeta(SYNC_STATE_KEY, now);
      const pending = await localDb.getMeta(PENDING_MUTATIONS_KEY) || [];
      syncState = { status: 'idle', lastSyncAt: now, error: null, pendingMutations: pending.length };
      notify(syncState);
    } catch (err) {
      const pending = await localDb.getMeta(PENDING_MUTATIONS_KEY) || [];
      syncState = { status: 'error', lastSyncAt: syncState.lastSyncAt, error: err.message, pendingMutations: pending.length };
      notify(syncState);
    }
  },
  async push() {
    const pending = await localDb.getMeta(PENDING_MUTATIONS_KEY);
    if (!pending || pending.length === 0) {
      syncState = { ...syncState, pendingMutations: 0 };
      notify(syncState);
      return;
    }
    syncState = { ...syncState, status: 'syncing' };
    notify(syncState);
    try {
      const res = await api.post('/sync/push', { mutations: pending });
      await localDb.setMeta(PENDING_MUTATIONS_KEY, []);
      if (res.timestamp) {
        await localDb.setMeta(SYNC_STATE_KEY, res.timestamp);
      }
      syncState = { status: 'idle', lastSyncAt: res.timestamp || new Date().toISOString(), error: null, pendingMutations: 0 };
      notify(syncState);
    } catch (err) {
      const pending2 = await localDb.getMeta(PENDING_MUTATIONS_KEY) || [];
      syncState = { status: 'error', lastSyncAt: syncState.lastSyncAt, error: err.message, pendingMutations: pending2.length };
      notify(syncState);
    }
  },
  async queueMutation(mutation) {
    const pending = (await localDb.getMeta(PENDING_MUTATIONS_KEY)) || [];
    pending.push(mutation);
    await localDb.setMeta(PENDING_MUTATIONS_KEY, pending);
    syncState = { ...syncState, pendingMutations: pending.length };
    notify(syncState);
    if (getOnlineStatus()) {
      this.push().catch(() => {});
    }
  },
  async syncAll() {
    if (syncPromise) await syncPromise;
    await this.pull();
    await this.push();
  },
  startAutoSync(intervalMs = 60000) {
    this.stopAutoSync();
    autoSyncTimer = setInterval(async () => {
      if (!getOnlineStatus()) return;
      try {
        await this.pull();
        await this.push();
      } catch { /* silent */ }
    }, intervalMs);
  },
  stopAutoSync() {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      autoSyncTimer = null;
    }
  },
  async destroy() {
    this.stopAutoSync();
    await localDb.destroy();
    syncState = { status: 'idle', lastSyncAt: null, error: null, pendingMutations: 0 };
    notify(syncState);
  },
  async repair() {
    this.stopAutoSync();
    await localDb.destroy();
    syncState = { status: 'idle', lastSyncAt: null, error: null, pendingMutations: 0 };
    notify(syncState);
    syncPromise = null;
    await this.init(true);
  },
};
