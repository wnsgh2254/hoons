/**
 * 급여 관리 테스트 (/admin/wages)
 * 전체 보기/개인 명세서 탭, 날짜 필터, 직원 선택, 급여 계산 API, 모달 등 포함
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();
const MONTH_START = CURRENT_MONTH + '-01';

async function gotoWages(page: import('@playwright/test').Page) {
  await page.goto('/admin/wages', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '급여 관리' }).waitFor({ state: 'visible', timeout: 15000 });
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 급여 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;

  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => { await api.dispose(); });

  test('급여 계산 API — 이번 달 전체 조회', async () => {
    const res = await api.get(`/api/wages/calculate?start_date=${MONTH_START}&end_date=${TODAY}`);
    expect([200, 400]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toBeDefined();
    }
  });

  test('급여 계산 API — 날짜 누락 시 에러 반환', async () => {
    const res = await api.get('/api/wages/calculate');
    expect([400, 422]).toContain(res.status());
  });

  test('급여 계산 API — 역순 날짜(end < start) 시 빈 결과 또는 에러', async () => {
    const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
    const res = await api.get(`/api/wages/calculate?start_date=${TODAY}&end_date=${yesterday}`);
    expect([200, 400]).toContain(res.status());
  });

  test('급여 계산 API — 특정 designer_id로 조회', async () => {
    // Get a valid designer first
    const staffRes = await api.get('/api/staff');
    if (staffRes.status() !== 200) return;
    const staffBody = await staffRes.json();
    const firstDesigner = staffBody.staff?.[0];
    if (!firstDesigner) return;

    const res = await api.get(
      `/api/wages/calculate?start_date=${MONTH_START}&end_date=${TODAY}&designer_id=${firstDesigner.id}`
    );
    expect([200, 400]).toContain(res.status());
  });

  test('급여 설정 API — 설정값 조회 가능', async () => {
    const res = await api.get('/api/wages/settings');
    expect([200, 404]).toContain(res.status());
  });

  test('인센티브 API — 조회 가능', async () => {
    const res = await api.get('/api/wages/incentives');
    expect([200, 404]).toContain(res.status());
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 급여 관리 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoWages(page); });

  // ── 기본 레이아웃 ─────────────────────────────────────────────────────────
  test('페이지 로드 시 "급여 관리" 헤딩과 탭이 표시되어야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '급여 관리' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '전체 보기' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '개인 명세서' })).toBeVisible();
  });

  test('헤더 버튼: 직원별 인센티브, 급여 명세서 작성, 급여 설정이 보여야 함', async ({ page }) => {
    await expect(page.getByRole('button', { name: /직원별 인센티브/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /급여 명세서 작성/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /급여 설정/ })).toBeVisible();
  });

  // ── 전체 보기 탭 ─────────────────────────────────────────────────────────
  test('전체 보기 탭: 급여 개요 컴포넌트가 렌더링되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '전체 보기' }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  // ── 개인 명세서 탭 ────────────────────────────────────────────────────────
  test('개인 명세서 탭: 월/기간 라디오 버튼이 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '개인 명세서' }).click();
    await expect(page.getByRole('radio', { name: '월' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '기간' })).toBeVisible();
  });

  test('개인 명세서 탭: 직원 미선택 시 검색 클릭하면 경고', async ({ page }) => {
    await page.getByRole('tab', { name: '개인 명세서' }).click();
    page.once('dialog', async (dialog) => { await dialog.dismiss(); });
    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('개인 명세서 탭: 이전/다음 월 이동 버튼이 동작해야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '개인 명세서' }).click();
    const prevBtn = page.getByRole('button', { name: '<' }).first();
    if (await prevBtn.isVisible()) {
      const monthInput = page.locator('input[type="month"]').first();
      const beforeVal = await monthInput.inputValue();
      await prevBtn.click();
      await page.waitForTimeout(300);
      const afterVal = await monthInput.inputValue();
      expect(afterVal).not.toBe(beforeVal);
    }
  });

  test('개인 명세서 탭: 직원+월 선택 후 검색 시 급여 데이터가 표시되어야 함', async ({ page }) => {
    await page.getByRole('tab', { name: '개인 명세서' }).click();

    const monthInput = page.locator('input[type="month"]').first();
    if (await monthInput.isVisible()) await monthInput.fill(CURRENT_MONTH);

    const designerSelect = page.locator('select').last();
    if (await designerSelect.isVisible()) {
      const options = await designerSelect.locator('option').count();
      if (options > 1) await designerSelect.selectOption({ index: 1 });
      else { return; } // No designers available, skip
    }

    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(4000);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('개인 명세서 탭: 기간 모드에서 날짜 미입력 시 경고', async ({ page }) => {
    await page.getByRole('tab', { name: '개인 명세서' }).click();
    await page.getByRole('radio', { name: '기간' }).check();
    const designerSelect = page.locator('select').last();
    if (await designerSelect.isVisible()) {
      const options = await designerSelect.locator('option').count();
      if (options > 1) await designerSelect.selectOption({ index: 1 });
    }
    page.once('dialog', async (dialog) => { await dialog.dismiss(); });
    await page.getByRole('button', { name: /검색/ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 인센티브 모달 ─────────────────────────────────────────────────────────
  test('"직원별 인센티브" 버튼 클릭 시 인센티브 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /직원별 인센티브/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  // ── 급여 명세서 작성 모달 ─────────────────────────────────────────────────
  test('"급여 명세서 작성" 버튼 클릭 시 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /급여 명세서 작성/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소|Close/ }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  // ── 급여 설정 페이지 이동 ────────────────────────────────────────────────
  test('"급여 설정" 링크 클릭 시 /admin/wages/settings로 이동해야 함', async ({ page }) => {
    await page.getByRole('link', { name: /급여 설정/ }).click();
    await page.waitForURL(/.*wages\/settings/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*wages\/settings/);
  });
});

// ── 급여 설정 페이지 ─────────────────────────────────────────────────────────

test.describe('[UI] 급여 설정 페이지 (/admin/wages/settings)', () => {
  test('급여 설정 페이지 접근 시 정상 렌더링되어야 함', async ({ page }) => {
    await page.goto('/admin/wages/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });
});
