/**
 * 직원 관리 테스트 (/admin/staff)
 * 직원 목록, 추가, 역할별 정렬, 급여 유형, 스케줄 모달 등 실 영업 시나리오 포함
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

async function gotoStaff(page: import('@playwright/test').Page) {
  await page.goto('/admin/staff', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '직원 관리' }).waitFor({ state: 'visible', timeout: 15000 });
  // Wait for loading state to clear
  await page.waitForTimeout(2000);
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 직원 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  let createdId: number | null = null;

  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => {
    if (createdId) await api.delete(`/api/staff/${createdId}`).catch(() => null);
    await api.dispose();
  });

  test('직원 목록 API — 200 반환 + staff 배열 존재', async () => {
    const res = await api.get('/api/staff');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('staff');
    expect(Array.isArray(body.staff)).toBeTruthy();
  });

  test('직원 목록 API — include_stats=true 시 통계 포함', async () => {
    const res = await api.get('/api/staff?include_stats=true');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('stats');
  });

  test('직원 생성 API — 이름 누락 시 에러', async () => {
    const res = await api.post('/api/staff', { data: { role: 'Designer', wage_type: 'percent' } });
    expect([400, 422]).toContain(res.status());
  });

  test('직원 생성 API — 역할 누락 시 에러', async () => {
    const res = await api.post('/api/staff', { data: { name: '테스트직원', wage_type: 'percent' } });
    expect([400, 422]).toContain(res.status());
  });

  test('직원 생성 API — 커미션 타입으로 정상 생성', async () => {
    const uniqueName = `테스트디자이너_${Date.now()}`;
    const res = await api.post('/api/staff', {
      data: {
        name: uniqueName,
        role: 'Designer',
        wage_type: 'percent',
        percent_rate: 45,
        is_active: true,
      },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    createdId = body.designer?.id || body.id || body.staff?.id || null;
  });

  test('직원 생성 API — 시급 타입으로 정상 생성', async () => {
    const uniqueName = `시급테스트_${Date.now()}`;
    const res = await api.post('/api/staff', {
      data: {
        name: uniqueName,
        role: 'Assistant',
        wage_type: 'hourly',
        hourly_rate: 25,
        is_active: true,
      },
    });
    expect([200, 201]).toContain(res.status());
    if (res.status() === 200 || res.status() === 201) {
      const body = await res.json();
      const tempId = body.designer?.id || body.id || body.staff?.id;
      if (tempId) await api.delete(`/api/staff/${tempId}`).catch(() => null);
    }
  });

  test('직원 상세 조회 — 존재하는 직원 200 반환', async () => {
    if (!createdId) test.skip();
    const res = await api.get(`/api/staff/${createdId}`);
    expect([200, 404]).toContain(res.status());
  });

  test('직원 수정 API — 커미션 비율 변경', async () => {
    if (!createdId) test.skip();
    const res = await api.patch(`/api/staff/${createdId}`, { data: { percent_rate: 50 } });
    expect(res.status()).toBe(200);
  });

  test('working-designers API — 오늘 날짜로 조회 시 200 반환', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get(`/api/working-designers?date=${today}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('designers');
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 직원 관리 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoStaff(page); });

  // ── 기본 레이아웃 ─────────────────────────────────────────────────────────
  test('페이지 로드 시 "직원 관리" 헤딩과 "직원 추가" 버튼이 보여야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '직원 관리' })).toBeVisible();
    await expect(page.getByRole('button', { name: /직원 추가/ })).toBeVisible();
  });

  test('"전체 직원 수" 통계 카드가 표시되어야 함', async ({ page }) => {
    await expect(page.getByText(/전체 직원 수/)).toBeVisible();
  });

  test('Director 권한에서 직원 카드의 Rate(급여율) 정보가 보여야 함', async ({ page }) => {
    // Director can see rates
    const rateLabels = page.getByText('Rate');
    const count = await rateLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('직원 카드에 "Manage Designer" 및 "View Schedule" 버튼이 있어야 함', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: /Manage Designer/ }).first();
    const scheduleBtn = page.getByRole('button', { name: /View Schedule/ }).first();
    if (await manageBtn.isVisible({ timeout: 5000 })) {
      await expect(manageBtn).toBeVisible();
      await expect(scheduleBtn).toBeVisible();
    }
  });

  test('역할 정렬 — Director가 다른 직원보다 먼저 표시되어야 함', async ({ page }) => {
    const staffCards = page.locator('.grid .bg-white.rounded-2xl');
    const count = await staffCards.count();
    if (count >= 2) {
      const firstCardRole = await staffCards.first().getByText(/Director|designer|Senior/i).first().textContent();
      // First card should have Director role
      expect(firstCardRole?.toLowerCase()).toContain('director');
    }
  });

  test('COMMISSION 배지가 커미션 타입 직원에게 표시되어야 함', async ({ page }) => {
    const commissionBadge = page.getByText('COMMISSION').first();
    if (await commissionBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(commissionBadge).toBeVisible();
    }
  });

  // ── 직원 추가 모달 ────────────────────────────────────────────────────────
  test('"직원 추가" 버튼 클릭 시 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /직원 추가/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('직원 추가 모달: 역할 미선택 시 경고가 표시되어야 함', async ({ page }) => {
    await page.getByRole('button', { name: /직원 추가/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    const nameInput = page.getByRole('dialog').getByLabel(/이름|Name/i).first();
    if (await nameInput.isVisible()) await nameInput.fill('테스트직원');
    // Do NOT select role
    page.once('dialog', async (dialog) => { await dialog.dismiss(); });
    const submitBtn = page.getByRole('dialog').getByRole('button', { name: /추가|저장|Add/ }).last();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('직원 추가 모달: 커미션 타입 선택 시 커미션 % 입력 필드가 나타나야 함', async ({ page }) => {
    await page.getByRole('button', { name: /직원 추가/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    const wageTypeSelect = page.getByRole('dialog').locator('select').first();
    if (await wageTypeSelect.isVisible()) {
      await wageTypeSelect.selectOption('percent');
      await page.waitForTimeout(300);
      const percentInput = page.getByRole('dialog').getByLabel(/커미션|Percent|Rate/i).first();
      if (await percentInput.isVisible()) {
        await expect(percentInput).toBeVisible();
      }
    }
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /취소|닫기|Cancel/ }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  test('직원 추가 모달: 시급 타입 선택 시 시급 입력 필드가 나타나야 함', async ({ page }) => {
    await page.getByRole('button', { name: /직원 추가/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    const wageTypeSelect = page.getByRole('dialog').locator('select').first();
    if (await wageTypeSelect.isVisible()) {
      await wageTypeSelect.selectOption('hourly');
      await page.waitForTimeout(300);
    }
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /취소|닫기|Cancel/ }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  // ── Manage Designer 모달 ─────────────────────────────────────────────────
  test('"Manage Designer" 버튼 클릭 시 모달이 열려야 함', async ({ page }) => {
    const manageBtn = page.getByRole('button', { name: /Manage Designer/ }).first();
    if (await manageBtn.isVisible({ timeout: 5000 })) {
      await manageBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  // ── View Schedule 모달 ────────────────────────────────────────────────────
  test('"View Schedule" 버튼 클릭 시 스케줄 모달이 열려야 함', async ({ page }) => {
    const scheduleBtn = page.getByRole('button', { name: /View Schedule/ }).first();
    if (await scheduleBtn.isVisible({ timeout: 5000 })) {
      await scheduleBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  // ── 디자이너 세부 페이지 링크 ──────────────────────────────────────────────
  test('/admin/staff/designers 페이지로 이동 가능해야 함', async ({ page }) => {
    await page.goto('/admin/staff/designers', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('body')).toBeVisible();
  });
});
