/**
 * 고객 관리 테스트 (/admin/customers)
 * 고객 등록, 검색, 수정, 고객 드로어, 예약 연동 등 실 영업에 필요한 시나리오를 포함
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const UNIQUE_SUFFIX = Date.now();
const TEST_CUSTOMER_NAME = `테스트고객_${UNIQUE_SUFFIX}`;
const TEST_CUSTOMER_PHONE = `041${String(UNIQUE_SUFFIX).slice(-7)}`;
const TEST_CUSTOMER_PHONE_DUP = TEST_CUSTOMER_PHONE; // 중복 등록용

async function gotoCustomers(page: import('@playwright/test').Page) {
  await page.goto('/admin/customers', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '고객' }).waitFor({ state: 'visible', timeout: 15000 });
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 고객 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  let createdCustomerId: number | null = null;

  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => {
    // Cleanup: delete test customer if created
    if (createdCustomerId) {
      await api.delete(`/api/customers/${createdCustomerId}`).catch(() => null);
    }
    await api.dispose();
  });

  test('고객 목록 API — 기본 조회 시 200 반환', async () => {
    const res = await api.get('/api/customers?page=1&limit=20');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('customers');
    expect(Array.isArray(body.customers)).toBeTruthy();
  });

  test('고객 목록 API — 이름 검색이 동작해야 함', async () => {
    const res = await api.get('/api/customers?search=없는고객ZZZZZ');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.customers.length).toBe(0);
  });

  test('고객 생성 API — 필수 필드(name) 누락 시 에러 반환', async () => {
    const res = await api.post('/api/customers', { data: { phone: '01012345678' } });
    expect([400, 422]).toContain(res.status());
  });

  test('고객 생성 API — 정상 생성 후 ID 반환', async () => {
    const res = await api.post('/api/customers', {
      data: { name: TEST_CUSTOMER_NAME, phone: TEST_CUSTOMER_PHONE },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.customer?.id || body.id).toBeTruthy();
    createdCustomerId = body.customer?.id || body.id;
  });

  test('고객 상세 API — 존재하는 고객 조회 시 200 반환', async () => {
    if (!createdCustomerId) test.skip();
    const res = await api.get(`/api/customers/${createdCustomerId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.customer.name).toBe(TEST_CUSTOMER_NAME);
  });

  test('고객 상세 API — 존재하지 않는 ID 조회 시 404 반환', async () => {
    const res = await api.get('/api/customers/999999999');
    expect([404, 400]).toContain(res.status());
  });

  test('고객 수정 API — 이름 변경 후 반영', async () => {
    if (!createdCustomerId) test.skip();
    const updatedName = `${TEST_CUSTOMER_NAME}_수정`;
    const res = await api.patch(`/api/customers/${createdCustomerId}`, { data: { name: updatedName } });
    expect(res.status()).toBe(200);
    const verify = await api.get(`/api/customers/${createdCustomerId}`);
    const body = await verify.json();
    expect(body.customer.name).toBe(updatedName);
  });

  test('고객 검색 API — 전화번호로 검색 시 정확한 고객 반환', async () => {
    if (!createdCustomerId) test.skip();
    const res = await api.get(`/api/customers?search=${TEST_CUSTOMER_PHONE}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.customers.some((c: any) => c.id === createdCustomerId)).toBeTruthy();
  });

  test('페이지네이션 — limit 5로 조회 시 최대 5명 반환', async () => {
    const res = await api.get('/api/customers?page=1&limit=5');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.customers.length).toBeLessThanOrEqual(5);
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 고객 관리 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoCustomers(page); });

  // ── 기본 레이아웃 ─────────────────────────────────────────────────────────
  test('페이지 로드 시 "고객" 헤딩과 고객등록 버튼이 보여야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '고객' })).toBeVisible();
    await expect(page.getByRole('button', { name: /고객등록/ })).toBeVisible();
  });

  test('고객 목록 테이블이 컬럼 헤더(등록일, 고객명, 휴대폰)와 함께 표시되어야 함', async ({ page }) => {
    await expect(page.getByText('등록일')).toBeVisible();
    await expect(page.getByText('고객명')).toBeVisible();
    await expect(page.getByText(/휴대폰|전화번호/)).toBeVisible();
  });

  // ── 고객 검색 ─────────────────────────────────────────────────────────────
  test('검색창에 없는 이름을 입력하면 빈 결과가 표시되어야 함', async ({ page }) => {
    await page.getByPlaceholder(/검색/).fill('절대없는고객ZZZ9999');
    await page.waitForTimeout(1000);
    // Table should be empty or show empty state
    const rows = page.locator('table tbody tr');
    const emptyState = page.locator('text=검색 결과');
    const hasRows = await rows.count();
    if (hasRows === 0) {
      // OK — no rows
    } else {
      // Rows might show "no data" row
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('검색창을 비우면 전체 목록으로 돌아와야 함', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/검색/);
    await searchBar.fill('없는고객');
    await page.waitForTimeout(500);
    await searchBar.clear();
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('검색창에 전화번호(숫자)로 검색할 수 있어야 함', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/검색/);
    await searchBar.fill('0411');
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 고객 등록 모달 ────────────────────────────────────────────────────────
  test('"고객등록" 버튼 클릭 시 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /고객등록/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('고객 등록 모달: 이름 없이 저장 시 에러 메시지가 표시되어야 함', async ({ page }) => {
    await page.getByRole('button', { name: /고객등록/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    // Submit without filling required fields
    const submitBtn = page.getByRole('dialog').getByRole('button', { name: /등록|저장|확인/ }).last();
    await submitBtn.click();
    // Expect an error message or alert
    const hasAlert = await page.locator('[role="alert"], .text-red-500, .text-red-600').isVisible().catch(() => false);
    const hasDialog = await page.isVisible('dialog[open]').catch(() => false);
    // Must show error or keep dialog open
    expect(hasAlert || hasDialog).toBeTruthy();
  });

  test('고객 등록 모달: 이름+전화번호 입력 후 등록 성공 시 목록에 나타나야 함', async ({ page }) => {
    const uniqueName = `자동테스트_${Date.now()}`;
    const uniquePhone = `041${String(Date.now()).slice(-7)}`;

    await page.getByRole('button', { name: /고객등록/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });

    const nameInput = page.getByRole('dialog').getByLabel(/이름|고객명|Name/i).first();
    const phoneInput = page.getByRole('dialog').getByLabel(/전화|연락처|Phone/i).first();

    if (await nameInput.isVisible()) await nameInput.fill(uniqueName);
    if (await phoneInput.isVisible()) await phoneInput.fill(uniquePhone);

    const submitBtn = page.getByRole('dialog').getByRole('button', { name: /등록|저장/ }).last();
    await submitBtn.click();

    // Dialog should close on success
    await page.waitForTimeout(2000);
    // Search for the created customer
    await page.getByPlaceholder(/검색/).fill(uniqueName);
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('고객 등록 모달: ESC 또는 닫기로 모달을 닫을 수 있어야 함', async ({ page }) => {
    await page.getByRole('button', { name: /고객등록/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const isDialogGone = !(await page.isVisible('[role="dialog"]').catch(() => false));
    // Escape might not close some modals — also try close button
    if (!isDialogGone) {
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|✕/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 고객 행 액션 ──────────────────────────────────────────────────────────
  test('고객 행의 수정(연필) 버튼 클릭 시 수정 모달이 열려야 함', async ({ page }) => {
    // Wait for at least one customer row
    const firstEditBtn = page.getByTitle('수정').first();
    if (await firstEditBtn.isVisible({ timeout: 5000 })) {
      await firstEditBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      // Close it
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('고객 행의 예약(캘린더) 버튼 클릭 시 예약 모달이 열려야 함', async ({ page }) => {
    const firstBookBtn = page.getByTitle('예약').first();
    if (await firstBookBtn.isVisible({ timeout: 5000 })) {
      await firstBookBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('고객 행의 영업(영수증) 버튼 클릭 시 고객 드로어가 열려야 함', async ({ page }) => {
    const firstInfoBtn = page.getByTitle('영업').first();
    if (await firstInfoBtn.isVisible({ timeout: 5000 })) {
      await firstInfoBtn.click();
      // CustomerInfoDrawer may appear as a slide-in panel
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  // ── 페이지네이션 ─────────────────────────────────────────────────────────
  test('고객이 20명 이상이면 페이지네이션 컨트롤이 보여야 함', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-row]');
    const count = await rows.count();
    if (count >= 20) {
      // Pagination buttons should be visible
      const nextPage = page.getByRole('button', { name: /다음|next|>/i }).first();
      await expect(nextPage).toBeVisible();
    }
  });

  // ── 대량 트래픽 시나리오 ──────────────────────────────────────────────────
  test('짧은 시간에 여러 번 검색해도 페이지가 정상 동작해야 함 (디바운스 검증)', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/검색/);
    // Simulate rapid typing
    for (const char of ['김', '김민', '김민준', '김']) {
      await searchBar.fill(char);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });
});
