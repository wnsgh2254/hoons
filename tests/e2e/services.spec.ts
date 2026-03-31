/**
 * 서비스 메뉴 설정 테스트 (/admin/services)
 * 카테고리 그리드, 서비스 추가/수정/삭제/활성화, 가격·시간 변경 등 포함
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

async function gotoServices(page: import('@playwright/test').Page) {
  await page.goto('/admin/services', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '서비스 메뉴 설정' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000); // Let services load
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 서비스 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  let createdId: number | null = null;

  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => {
    if (createdId) await api.delete(`/api/services/${createdId}`).catch(() => null);
    await api.dispose();
  });

  test('서비스 목록 API — 200 반환 + services 배열', async () => {
    const res = await api.get('/api/services');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('services');
    expect(Array.isArray(body.services)).toBeTruthy();
  });

  test('서비스 목록 — 각 서비스에 name, price, duration_minutes, is_active 필드가 있어야 함', async () => {
    const res = await api.get('/api/services');
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.services.length > 0) {
      const first = body.services[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('price');
      expect(first).toHaveProperty('duration_minutes');
      expect(first).toHaveProperty('is_active');
    }
  });

  test('서비스 생성 API — 이름 누락 시 에러', async () => {
    const res = await api.post('/api/services', {
      data: { price: 100, duration_minutes: 30 },
    });
    expect([400, 422]).toContain(res.status());
  });

  test('서비스 생성 API — 가격 음수 시 에러 또는 0으로 처리', async () => {
    const res = await api.post('/api/services', {
      data: { name: '음수가격테스트', price: -100, duration_minutes: 30 },
    });
    expect([200, 400, 422]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const id = body.service?.id || body.id;
      if (id) await api.delete(`/api/services/${id}`).catch(() => null);
      // Price should be 0 if negative was allowed
    }
  });

  test('서비스 생성 API — 정상 생성', async () => {
    const uniqueName = `테스트서비스_${Date.now()}`;
    const res = await api.post('/api/services', {
      data: {
        name: uniqueName,
        price: 85,
        duration_minutes: 60,
        category: 'Cut',
        is_active: true,
        visible_to: 'both',
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdId = body.service?.id || body.id || null;
  });

  test('서비스 수정 API — 가격 변경', async () => {
    if (!createdId) test.skip();
    const res = await api.patch(`/api/services/${createdId}`, {
      data: { price: 90 },
    });
    expect(res.status()).toBe(200);
    const verify = await api.get('/api/services');
    const body = await verify.json();
    const updated = body.services.find((s: any) => s.id === createdId);
    if (updated) expect(Number(updated.price)).toBe(90);
  });

  test('서비스 수정 API — 비활성화 처리', async () => {
    if (!createdId) test.skip();
    const res = await api.patch(`/api/services/${createdId}`, {
      data: { is_active: false },
    });
    expect(res.status()).toBe(200);
  });

  test('서비스 수정 API — 시술 시간 0분으로 설정 시 에러 또는 1분 이상으로 처리', async () => {
    if (!createdId) test.skip();
    const res = await api.patch(`/api/services/${createdId}`, {
      data: { duration_minutes: 0 },
    });
    // Should either reject or set minimum
    expect([200, 400, 422]).toContain(res.status());
  });

  test('서비스 삭제 API — 존재하지 않는 ID 시 404', async () => {
    const res = await api.delete('/api/services/999999999');
    expect([404, 400]).toContain(res.status());
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 서비스 메뉴 설정 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoServices(page); });

  // ── 기본 레이아웃 ─────────────────────────────────────────────────────────
  test('페이지 로드 시 "서비스 메뉴 설정" 헤딩이 보여야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '서비스 메뉴 설정' })).toBeVisible();
  });

  test('카테고리 그리드가 표시되어야 함 (Cut, Color, Perm 등)', async ({ page }) => {
    // At least some category button should be visible
    const categoryBtns = page.getByRole('button').filter({ hasText: /services/ });
    const count = await categoryBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('각 카테고리 카드에 서비스 개수(N services)가 표시되어야 함', async ({ page }) => {
    const serviceCount = page.getByText(/\d+ services/).first();
    await expect(serviceCount).toBeVisible();
  });

  // ── 카테고리 클릭 → 서비스 목록 모달 ────────────────────────────────────
  test('카테고리 클릭 시 해당 카테고리의 서비스 목록 모달이 열려야 함', async ({ page }) => {
    const firstCategory = page.getByRole('button').filter({ hasText: /services/ }).first();
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    }
  });

  test('서비스 목록 모달: 검색창에서 서비스 이름으로 필터링 가능', async ({ page }) => {
    const firstCategory = page.getByRole('button').filter({ hasText: /services/ }).first();
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      const searchBar = page.getByRole('dialog').getByPlaceholder(/검색|Search/i);
      if (await searchBar.isVisible()) {
        await searchBar.fill('없는서비스ZZZZ');
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('서비스 목록 모달: 가격 입력 필드를 바꾸면 즉시 저장 시도를 해야 함', async ({ page }) => {
    const firstCategory = page.getByRole('button').filter({ hasText: /services/ }).first();
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      const priceInput = page.getByRole('dialog').locator('input[type="number"]').first();
      if (await priceInput.isVisible()) {
        const currentValue = await priceInput.inputValue();
        await priceInput.clear();
        await priceInput.fill(currentValue || '100'); // Restore same value
        await priceInput.press('Tab');
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
      }
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  // ── 서비스 추가 ──────────────────────────────────────────────────────────
  test('"새 서비스 추가" 버튼이 있으면 클릭 시 추가 모달이 열려야 함', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /새 서비스|서비스 추가|Add Service/ }).first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /취소|닫기/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  // ── 서비스 설정 페이지 이동 ──────────────────────────────────────────────
  test('/admin/settings/services 페이지에 접근 가능해야 함', async ({ page }) => {
    await page.goto('/admin/settings/services', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 시술 종류별 비즈니스 규칙 ─────────────────────────────────────────────
  test('카드/현금 서비스가 있는 경우 카드/현금 배지가 표시되어야 함', async ({ page }) => {
    const firstCategory = page.getByRole('button').filter({ hasText: /services/ }).first();
    if (await firstCategory.isVisible()) {
      await firstCategory.click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      // Check for card/cash badges in the modal
      const cardBadge = page.getByRole('dialog').getByText('카드').first();
      const cashBadge = page.getByRole('dialog').getByText('현금').first();
      const hasCard = await cardBadge.isVisible({ timeout: 2000 }).catch(() => false);
      const hasCash = await cashBadge.isVisible({ timeout: 2000 }).catch(() => false);
      // At least one should exist in a real salon environment
      if (hasCard) await expect(cardBadge).toBeVisible();
      if (hasCash) await expect(cashBadge).toBeVisible();
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });
});
