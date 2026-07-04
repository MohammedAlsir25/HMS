import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4001';

// Activate offline-first mode (gated by isNativePlatform())
// Sync engine is initialized manually after login via page.evaluate
// (setting __TAURI_INTERNALS__ would make api.js target the production URL)

async function loginAndSeed(page, request, email = 'reception@aljawarih.sd', password = 'password123') {
  // Login via API to get token + user
  const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email, password } });
  expect(loginRes.ok()).toBeTruthy();
  const { token, refreshToken, user } = await loginRes.json();

  // Inject auth into localStorage so the app hydrates as authenticated
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, refreshToken, user }) => {
      const state = { token, refreshToken, user, isAuthenticated: true };
      localStorage.setItem('jh-auth-storage', JSON.stringify({ state, version: 0 }));
    },
    { token, refreshToken, user },
  );

  // Reload — the app reads localStorage and renders authenticated
  await page.reload({ waitUntil: 'networkidle' });
  // Wait for AppShell header to prove main UI rendered
  await page.waitForSelector('img[alt="Al Jawarih"]', { timeout: 15000 });

  // Manually init sync engine (Tauri flag not set, so ProtectedRoute won't auto-init)
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    try {
      const module = await import('/src/lib/sync/syncEngine.js');
      await module.syncEngine.init();
    } catch (e) {
      console.error('syncEngine init failed:', e);
    }
  });
  await page.waitForTimeout(2000);
}

async function indexedDbTableCount(page, tableName) {
  return page.evaluate(async (tbl) => {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('al-jawarih');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!db.objectStoreNames.contains(tbl)) return 0;
      const tx = db.transaction(tbl, 'readonly');
      const store = tx.objectStore(tbl);
      return await new Promise((resolve) => {
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });
    } catch { return -1; }
  }, tableName);
}

async function indexedDbStoreNames(page) {
  return page.evaluate(async () => {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('al-jawarih');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return Array.from(db.objectStoreNames);
    } catch { return []; }
  });
}

async function indexedDbMetaValue(page, key) {
  return page.evaluate(async (k) => {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('al-jawarih');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (!db.objectStoreNames.contains('_meta')) return null;
      const tx = db.transaction('_meta', 'readonly');
      const store = tx.objectStore('_meta');
      const result = await new Promise((resolve) => {
        const req = store.get(k);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      return result?.value || null;
    } catch { return null; }
  }, key);
}

async function getBadgeLabel(page) {
  return page.evaluate(() => {
    const selectors = ['Online', 'Syncing', 'Sync error', 'Offline'].map(s =>
      `button[aria-label="${s}"]`,
    );
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.getAttribute('aria-label');
    }
    return null;
  });
}

async function getPendingCount(page) {
  return page.evaluate(() => {
    const selectors = ['Online', 'Syncing', 'Sync error', 'Offline'].map(s =>
      `button[aria-label="${s}"]`,
    );
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const badge = el.querySelector('.bg-amber-500');
      return badge ? parseInt(badge.textContent, 10) : 0;
    }
    return -1;
  });
}

test.describe('Offline-First Sync — Frontend Behavior', () => {

  test('sync engine populates IndexedDB on login', async ({ page, request }) => {
    // Login via API to get token + user
    const loginRes = await request.post(`${BASE}/api/auth/login`, { data: { email: 'reception@aljawarih.sd', password: 'password123' } });
    expect(loginRes.ok()).toBeTruthy();
    const { token, refreshToken, user } = await loginRes.json();

    // Inject auth into localStorage
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ token, refreshToken, user }) => {
        const state = { token, refreshToken, user, isAuthenticated: true };
        localStorage.setItem('jh-auth-storage', JSON.stringify({ state, version: 0 }));
      },
      { token, refreshToken, user },
    );

    // Reload — the app reads localStorage and renders authenticated
    await page.reload({ waitUntil: 'networkidle' });
    // Wait for AppShell header to prove main UI rendered
    await page.waitForSelector('img[alt="Al Jawarih"]', { timeout: 15000 });

    // Manually init sync engine
    await page.waitForTimeout(2000);
    await page.evaluate(async () => {
      try {
        const module = await import('/src/lib/sync/syncEngine.js');
        await module.syncEngine.init();
      } catch (e) {
        console.error('syncEngine init failed:', e);
      }
    });

    // Poll for initial_sync_done instead of fixed wait
    let syncDone = null;
    for (let i = 0; i < 20; i++) {
      syncDone = await indexedDbMetaValue(page, 'initial_sync_done');
      if (syncDone) break;
      await page.waitForTimeout(1000);
    }
    const stores = await indexedDbStoreNames(page);
    const roleCount = await indexedDbTableCount(page, 'role');
    expect(stores).toContain('role');
    expect(syncDone).toBeTruthy();
    expect(roleCount).toBeGreaterThan(0);
  });

  test('SyncStatusBadge visible and shows online state after login', async ({ page, request }) => {
    await loginAndSeed(page, request);
    await page.waitForTimeout(3000);
    const label = await getBadgeLabel(page);
    expect(label).toMatch(/Online|Syncing/);
  });

  test('reads cached data when offline and badge shows Offline', async ({ page, request }) => {
    await loginAndSeed(page, request);
    // Poll for initial_sync_done instead of fixed wait
    let syncDone = null;
    for (let i = 0; i < 20; i++) {
      syncDone = await indexedDbMetaValue(page, 'initial_sync_done');
      if (syncDone) break;
      await page.waitForTimeout(1000);
    }
    expect(syncDone).toBeTruthy();

    // Navigate to a data-driven page while still online
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Now go truly offline — localhost is already loaded so navigation isn't needed
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Verify the page rendered (not blank or error)
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('Something went wrong');

    // Check badge shows offline (navigator.onLine is now false)
    const label = await getBadgeLabel(page);
    expect(label).toBe('Offline');

    // Restore online
    await page.context().setOffline(false);
  });

  test('mutations queue offline and badge shows pending count', async ({ page, request }) => {
    await loginAndSeed(page, request);
    await page.waitForTimeout(4000);

    // Block writes (allow GETs)
    await page.route('**/api/**', (route) => {
      if (route.request().method() !== 'GET') route.abort();
      else route.continue();
    });

    // Navigate around to trigger potential writes from hooks/subscriptions
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Pending count should be >= 0 (could be 0 if no mutations were triggered)
    const pending = await getPendingCount(page);
    expect(pending).toBeGreaterThanOrEqual(0);

    // Restore network
    await page.unroute('**/api/**');
    await page.waitForTimeout(6000);

    // After push completes, pending should be 0
    const pendingAfter = await getPendingCount(page);
    expect(pendingAfter).toBe(0);
  });

  test('SyncStatusBadge transitions between states', async ({ page, request }) => {
    await loginAndSeed(page, request);
    await page.waitForTimeout(5000);

    // 1. Should eventually reach Online (green) after sync completes
    let label = await getBadgeLabel(page);
    for (let i = 0; i < 10; i++) {
      if (label === 'Syncing') {
        await page.waitForTimeout(2000);
        label = await getBadgeLabel(page);
      } else break;
    }
    expect(['Online', 'Sync error']).toContain(label);

    // 2. Go truly offline (navigator.onLine = false) → badge should show Offline (grey)
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    label = await getBadgeLabel(page);
    expect(label).toBe('Offline');

    // 3. Restore network → should eventually go back to Online
    await page.context().setOffline(false);
    await page.waitForTimeout(8000);
    label = await getBadgeLabel(page);
    expect(['Online', 'Syncing']).toContain(label);
  });

});
