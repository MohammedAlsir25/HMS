import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:4001';
const PASSWORD = 'password123';

let supplierId;
let itemId;

test.describe('Procure-to-Pay — Tier 2 Approval Workflow', () => {

  test.beforeAll(async ({ request }) => {
    // Login as Super Admin to create test supplier + inventory item
    const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
      data: { email: 'admin@aljawarih.sd', password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    expect(token).toBeTruthy();

    // Create a test supplier
    const supplierRes = await request.post(`${API_BASE}/api/pos/suppliers`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: `P2P Test Supplier ${Date.now()}`, category: 'pharmacy' },
    });
    expect(supplierRes.ok()).toBeTruthy();
    const supplier = await supplierRes.json();
    supplierId = supplier.id;

    // Create a test inventory item
    const itemRes = await request.post(`${API_BASE}/api/inventory/items`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: `P2P Test Item ${Date.now()}`, sku: `P2P-${Date.now()}`, category: 'pharmacy', price: 0, quantity: 0 },
    });
    expect(itemRes.ok()).toBeTruthy();
    const item = await itemRes.json();
    itemId = item.id;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data; FK violations (supplier referenced by PO) are caught silently
    try {
      const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
        data: { email: 'admin@aljawarih.sd', password: PASSWORD },
      });
      if (!loginRes.ok()) return;
      const { token } = await loginRes.json();
      const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      if (itemId) {
        await request.delete(`${API_BASE}/api/inventory/items/${itemId}`, { headers: authHeaders }).catch(() => {});
      }
      if (supplierId) {
        await request.delete(`${API_BASE}/api/pos/suppliers/${supplierId}`, { headers: authHeaders }).catch(() => {});
      }
    } catch { /* ignore cleanup errors */ }
  });

  test('Procurement Manager creates and submits PO → CFO approves it', async ({ page, request }) => {
    test.setTimeout(360000);

    // ── Step 1: Login as Procurement Manager ──
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 15000 });
    await page.fill('input[type="email"]', 'procurement@aljawarih.sd');
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // ── Step 2: Navigate to Procurement page ──
    await page.goto('/procurement');

    // ── Step 3: Click "Purchase Orders" tab ──
    await page.click('button:has-text("Purchase Orders")');

    // ── Step 4: Open the "New PO" modal ──
    await page.click('button:has-text("+ New PO")');
    // Wait for modal to load suppliers + cost centers
    await page.waitForSelector('select >> nth=2', { timeout: 10000 });

    // ── Step 5: Fill in the PO form ──
    // Department Type — keep default "Pharmacy"
    // Expense Type — select OPEX
    await page.selectOption('select >> nth=1', 'OPEX');

    // Select supplier — wait for option to exist before selecting
    const supplierSelect = page.locator('select >> nth=2');
    await supplierSelect.locator(`option[value="${supplierId}"]`).waitFor({ state: 'attached', timeout: 15000 });
    await supplierSelect.selectOption(String(supplierId));

    // Select cost center — pick first non-placeholder
    const costCenterSelect = page.locator('select >> nth=3');
    const costCenterOptions = await costCenterSelect.locator('option').all();
    if (costCenterOptions.length > 1) {
      const value = await costCenterOptions[1].getAttribute('value');
      if (value) await costCenterSelect.selectOption(value);
    }

    // ── Step 6: Add an item line ──
    await page.click('button:has-text("+ Add Item")');

    // Select the test product in the item dropdown
    const itemSelect = page.locator('select >> nth=4');
    await itemSelect.selectOption(String(itemId));

    // Fill Quantity
    await page.locator('input[type="number"] >> nth=0').fill('10');

    // Fill Unit Cost
    await page.locator('input[type="number"] >> nth=1').fill('10000');

    // Verify total shows SDG 100,000
    await expect(page.locator('p:has-text("SDG 100,000")')).toBeVisible();

    // ── Step 7: Submit the PO ──
    await page.click('button:has-text("Create Purchase Order")');

    // Verify PO appears in the table with DRAFT status
    await expect(page.locator('text=DRAFT').first()).toBeVisible({ timeout: 10000 });

    // ── Step 8: Submit the PO for approval ──
    await page.click('button:has-text("Submit")');

    // Verify status changed to PENDING_APPROVAL
    await expect(page.locator('text=PENDING_APPROVAL').first()).toBeVisible({ timeout: 10000 });

    // ── Step 9: Logout (clear session + navigate to login page) ──
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 15000 });

    // ── Step 10: Login as CFO ──
    await page.fill('input[type="email"]', 'cfo@aljawarih.sd');
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    // ── Step 11: Navigate to Procurement → Approval Queue ──
    await page.goto('/procurement');
    await page.click('button:has-text("Approval Queue")');

    // Verify PO appears in approval queue (no status column — all items are implicitly PENDING_APPROVAL)
    await expect(page.locator('text=Pending Approvals').first()).toBeVisible({ timeout: 15000 });

    // ── Step 12: Approve the PO ──
    await page.click('button:has-text("Approve")');

    // Verify approval: switch to Purchase Orders tab and check status
    await page.click('button:has-text("Purchase Orders")');

    // PO should now be APPROVED (no longer DRAFT or PENDING_APPROVAL)
    await expect(page.locator('text=APPROVED').first()).toBeVisible({ timeout: 10000 });
  });

});
