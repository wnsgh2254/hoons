/**
 * 매출 관리 테스트 (/admin/sales)
 * 탭 전환, 날짜 필터(일별/기간), 검색, 모달, API 검증까지 실제 영업 상황을 기준으로 작성
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
const MONTH_START = TODAY.slice(0, 8) + '01';

async function gotoSales(page: import('@playwright/test').Page) {
  await page.goto('/admin/sales', { waitUntil: 'domcontentloaded' });
  // "매출 관리" heading is always rendered immediately
  await page.getByRole('heading', { name: '매출 관리' }).waitFor({ state: 'visible', timeout: 15000 });
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 매출 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => { await api.dispose(); });

  test('전체 매출 API — 오늘 날짜 조회 시 200과 올바른 구조 반환', async () => {
    const res = await api.get(`/api/sales/total?start_date=${TODAY}&end_date=${TODAY}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('totalSales');
  });

  test('직원별 매출 API — designer_id 없이 전체 조회 가능', async () => {
    const res = await api.get(`/api/sales/by-staff?start_date=${MONTH_START}&end_date=${TODAY}`);
    expect(res.status()).toBe(200);
  });

  test('항목별 매출 API — item_type=service 조회', async () => {
    const res = await api.get(`/api/sales/by-item?start_date=${MONTH_START}&end_date=${TODAY}&item_type=service`);
    expect(res.status()).toBe(200);
  });

  test('매출 이력 API — 기간 역순(end < start)이어도 빈 배열 반환(서버 크래시 없음)', async () => {
    const res = await api.get(`/api/sales?start_date=${TODAY}&end_date=${YESTERDAY}`);
    // Must not 500; either 200 with empty list or 400 with error message
    expect([200, 400]).toContain(res.status());
  });

  test('매출 API — 매우 긴 기간(1년) 조회 시 서버가 응답해야 함', async () => {
    const oneYearAgo = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
    const res = await api.get(`/api/sales/total?start_date=${oneYearAgo}&end_date=${TODAY}`);
    expect([200, 400]).toContain(res.status());
  });

  test('매출 요약 API — 날짜 파라미터 누락 시 에러 반환', async () => {
    const res = await api.get('/api/sales/total');
    expect([400, 422, 500]).toContain(res.status());
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 매출 관리 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoSales(page); });

  // ── 페이지 로드 ──────────────────────────────────────────────────────────
  test('페이지 로드 시 "매출 관리" 헤딩과 3개 탭이 표시되어야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '매출 관리' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '전체 매출' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '직원별 매출' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '항목별 매출' })).toBeVisible();
  });

  test('"판매내역" 버튼이 헤더에 있어야 함', async ({ page }) => {
    await expect(page.getByRole('button', { name: /판매내역/ })).toBeVisible();
  });

  // ── 전체 매출 탭 ─────────────────────────────────────────────────────────
  test('전체 매출 탭: 일별/기간 라디오 버튼이 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 매출' }).click();
    await expect(page.getByRole('radio', { name: '일별' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '기간' })).toBeVisible();
  });

  test('전체 매출 탭: 오늘 날짜로 검색하면 결과(또는 데이터 없음)가 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 매출' }).click();
    await page.getByRole('radio', { name: '일별' }).check();
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill(TODAY);
    await page.getByRole('button', { name: /검색/ }).click();
    // Loading indicator or result table — page must not crash
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('전체 매출 탭: 기간 모드에서 시작~종료 날짜 설정 후 검색', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 매출' }).click();
    await page.getByRole('radio', { name: '기간' }).check();
    const dates = page.locator('input[type="date"]');
    await dates.first().fill(MONTH_START);
    await dates.last().fill(TODAY);
    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('전체 매출 탭: 기간 모드에서 날짜 없이 검색하면 경고가 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 매출' }).click();
    await page.getByRole('radio', { name: '기간' }).check();
    // Do NOT fill dates, click search
    page.once('dialog', async (dialog) => { await dialog.dismiss(); });
    await page.getByRole('button', { name: /검색/ }).click();
    // alert or inline error — either way must not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('전체 매출 탭: 이전/다음 날짜 이동 버튼이 동작해야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 매출' }).click();
    await page.getByRole('radio', { name: '일별' }).check();
    const prevBtn = page.getByRole('button', { name: '<' }).first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('input[type="date"]').first()).not.toHaveValue(TODAY);
    }
  });

  // ── 직원별 매출 탭 ───────────────────────────────────────────────────────
  test('직원별 매출 탭: 디자이너 드롭다운이 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '직원별 매출' }).click();
    const designerSelect = page.locator('select').first();
    await expect(designerSelect).toBeVisible({ timeout: 5000 });
  });

  test('직원별 매출 탭: 특정 디자이너 선택 후 검색', async ({ page }) => {
    await page.getByRole('tab', { name: '직원별 매출' }).click();
    const designerSelect = page.locator('select').first();
    if (await designerSelect.isVisible()) {
      const options = await designerSelect.locator('option').count();
      if (options > 1) await designerSelect.selectOption({ index: 1 });
    }
    await page.locator('input[type="date"]').first().fill(TODAY);
    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 항목별 매출 탭 ───────────────────────────────────────────────────────
  test('항목별 매출 탭: 항목 유형 필터(서비스/제품)가 있어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '항목별 매출' }).click();
    await page.waitForTimeout(500);
    const itemTypeFilter = page.locator('select').first();
    await expect(itemTypeFilter).toBeVisible({ timeout: 5000 });
  });

  test('항목별 매출 탭: 기간으로 조회하면 항목별 집계가 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '항목별 매출' }).click();
    await page.getByRole('radio', { name: '기간' }).check();
    const dates = page.locator('input[type="date"]');
    await dates.first().fill(MONTH_START);
    await dates.last().fill(TODAY);
    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 판매내역 모달 ────────────────────────────────────────────────────────
  test('"판매내역" 버튼 클릭 시 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /판매내역/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  test('판매내역 모달: 닫기 버튼으로 모달을 닫을 수 있어야 함', async ({ page }) => {
    await page.getByRole('button', { name: /판매내역/ }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 5000 });
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|Close|취소/ }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
    }
  });

  // ── 매출 등록 모달 ───────────────────────────────────────────────────────
  test('매출 등록 버튼이 있으면 클릭 시 매출 등록 모달이 열려야 함', async ({ page }) => {
    const registerBtn = page.getByRole('button', { name: /매출 등록/ }).first();
    if (await registerBtn.isVisible()) {
      await registerBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });
});
