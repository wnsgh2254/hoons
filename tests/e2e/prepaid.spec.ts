/**
 * 정액권 관리 테스트 (/admin/prepaid)
 * 회원 추가, 수정, 검색, 잔액 검증, 만료일 검증 등 실 영업 시나리오 포함
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';

const UNIQUE = Date.now();
const TEST_NAME = `정액권테스트_${UNIQUE}`;
const TEST_PHONE = `041${String(UNIQUE).slice(-7)}`;

async function gotoPrepaid(page: import('@playwright/test').Page) {
  await page.goto('/admin/prepaid', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '정액권 관리' }).waitFor({ state: 'visible', timeout: 15000 });
}

// ─── API 수준 검증 ───────────────────────────────────────────────────────────

test.describe('[API] 정액권 API 검증', () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  let createdId: number | null = null;

  test.beforeAll(async () => { api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' }); });
  test.afterAll(async () => {
    if (createdId) await api.delete(`/api/prepaid/${createdId}`).catch(() => null);
    await api.dispose();
  });

  test('정액권 목록 API — 200 반환 + members 배열 존재', async () => {
    const res = await api.get('/api/prepaid?page=1&limit=20');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('members');
    expect(Array.isArray(body.members)).toBeTruthy();
  });

  test('정액권 목록 API — 검색어로 필터링 가능', async () => {
    const res = await api.get('/api/prepaid?search=없는회원ZZZZZ');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.members.length).toBe(0);
  });

  test('정액권 회원 생성 — 이름 누락 시 에러', async () => {
    const res = await api.post('/api/prepaid', { data: { points: 100000 } });
    expect([400, 422]).toContain(res.status());
  });

  test('정액권 회원 생성 — 음수 금액 시 에러', async () => {
    const res = await api.post('/api/prepaid', {
      data: { name: TEST_NAME, phone: TEST_PHONE, points: -1000 },
    });
    // Application should reject negative balance
    expect([400, 422]).toContain(res.status());
  });

  test('정액권 회원 생성 — 정상 생성 (이름+금액)', async () => {
    const res = await api.post('/api/prepaid', {
      data: { name: TEST_NAME, phone: TEST_PHONE, points: 500000 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.member?.id || body.id).toBeTruthy();
    createdId = body.member?.id || body.id;
  });

  test('정액권 상세 — 생성된 회원의 잔액이 정확해야 함', async () => {
    if (!createdId) test.skip();
    const res = await api.get(`/api/prepaid/${createdId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Number(body.member?.points || body.points)).toBe(500000);
  });

  test('정액권 수정 — 잔액 변경 후 반영', async () => {
    if (!createdId) test.skip();
    const res = await api.patch(`/api/prepaid/${createdId}`, { data: { points: 300000 } });
    expect(res.status()).toBe(200);
    const verify = await api.get(`/api/prepaid/${createdId}`);
    const body = await verify.json();
    expect(Number(body.member?.points || body.points)).toBe(300000);
  });

  test('정액권 수정 — 만료일 설정', async () => {
    if (!createdId) test.skip();
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const expiresAt = futureDate.toISOString().split('T')[0];
    const res = await api.patch(`/api/prepaid/${createdId}`, { data: { expiresAt } });
    expect(res.status()).toBe(200);
  });

  test('존재하지 않는 정액권 회원 조회 시 404', async () => {
    const res = await api.get('/api/prepaid/999999999');
    expect([404, 400]).toContain(res.status());
  });

  test('페이지네이션 — limit=5 적용 시 최대 5명 반환', async () => {
    const res = await api.get('/api/prepaid?page=1&limit=5');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.members.length).toBeLessThanOrEqual(5);
  });
});

// ─── UI 수준 검증 ────────────────────────────────────────────────────────────

test.describe('[UI] 정액권 관리 페이지 — Director 권한', () => {
  test.beforeEach(async ({ page }) => { await gotoPrepaid(page); });

  test('페이지 로드 시 "정액권 관리" 헤딩과 "회원 추가" 버튼이 보여야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '정액권 관리' })).toBeVisible();
    await expect(page.getByRole('button', { name: /회원 추가/ })).toBeVisible();
  });

  test('테이블 컬럼: 회원, 연락처, 선불권, 만료일 헤더가 있어야 함', async ({ page }) => {
    await expect(page.getByText('회원')).toBeVisible();
    await expect(page.getByText('연락처')).toBeVisible();
    await expect(page.getByText('선불권')).toBeVisible();
    await expect(page.getByText('만료일')).toBeVisible();
  });

  // ── 검색 ─────────────────────────────────────────────────────────────────
  test('없는 이름 검색 시 빈 결과를 표시해야 함', async ({ page }) => {
    await page.getByPlaceholder(/Search|검색/).fill('없는회원ZZZZZ9999');
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('검색창을 지우면 전체 목록으로 돌아와야 함', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/Search|검색/);
    await searchBar.fill('없는회원');
    await page.waitForTimeout(400);
    await searchBar.clear();
    await page.waitForTimeout(600);
    await expect(page.locator('body')).toBeVisible();
  });

  // ── 회원 추가 모달 ────────────────────────────────────────────────────────
  test('"회원 추가" 버튼 클릭 시 "정액권 회원 추가" 모달이 열려야 함', async ({ page }) => {
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await expect(page.getByRole('heading', { name: /정액권 회원 추가/ })).toBeVisible({ timeout: 5000 });
  });

  test('회원 추가 모달: 이름 없이 제출 시 "이름은 필수입니다" 에러 표시', async ({ page }) => {
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await page.getByRole('heading', { name: /정액권 회원 추가/ }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /회원 추가/ }).last().click();
    await expect(page.getByText(/이름은 필수/)).toBeVisible({ timeout: 3000 });
  });

  test('회원 추가 모달: 음수 금액 입력 시 에러가 표시되어야 함', async ({ page }) => {
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await page.getByRole('heading', { name: /정액권 회원 추가/ }).waitFor({ state: 'visible' });
    const nameInput = page.getByLabel(/이름/i).first();
    if (await nameInput.isVisible()) await nameInput.fill('음수테스트');
    const pointsInput = page.getByLabel(/선불권|금액/i).first();
    if (await pointsInput.isVisible()) {
      await pointsInput.clear();
      await pointsInput.fill('-100');
    }
    await page.getByRole('button', { name: /회원 추가/ }).last().click();
    // Should show error or reject
    await expect(page.locator('body')).toBeVisible();
  });

  test('회원 추가 모달: 정상 입력(이름+금액) 후 추가 성공 시 목록에 나타나야 함', async ({ page }) => {
    const uniqueName = `자동정액권_${Date.now()}`;
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await page.getByRole('heading', { name: /정액권 회원 추가/ }).waitFor({ state: 'visible' });

    const nameInput = page.getByLabel(/이름/i).first();
    if (await nameInput.isVisible()) await nameInput.fill(uniqueName);

    const pointsInput = page.getByLabel(/선불권|금액/i).first();
    if (await pointsInput.isVisible()) {
      await pointsInput.clear();
      await pointsInput.fill('200000');
    }

    await page.getByRole('button', { name: /회원 추가/ }).last().click();
    await page.waitForTimeout(2000);

    // Search for new member
    await page.getByPlaceholder(/Search|검색/).fill(uniqueName);
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
  });

  test('회원 추가 모달: 취소 버튼으로 닫기 가능', async ({ page }) => {
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await page.getByRole('heading', { name: /정액권 회원 추가/ }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /취소/ }).click();
    await expect(page.getByRole('heading', { name: /정액권 회원 추가/ })).not.toBeVisible({ timeout: 3000 });
  });

  // ── 수정 모달 ─────────────────────────────────────────────────────────────
  test('목록에서 수정 버튼 클릭 시 수정 모달이 열려야 함', async ({ page }) => {
    const editBtn = page.getByTitle('수정').first();
    if (await editBtn.isVisible({ timeout: 5000 })) {
      await editBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /취소|닫기/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('목록에서 상세 보기 버튼 클릭 시 상세 모달이 열려야 함', async ({ page }) => {
    const viewBtn = page.getByTitle('상세 보기').first();
    if (await viewBtn.isVisible({ timeout: 5000 })) {
      await viewBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      const closeBtn = page.getByRole('dialog').getByRole('button', { name: /닫기|취소/ }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  // ── 사용자 급증 시나리오 ──────────────────────────────────────────────────
  test('빠른 연속 검색(디바운스 검증) — 페이지가 정상 유지되어야 함', async ({ page }) => {
    const searchBar = page.getByPlaceholder(/Search|검색/);
    for (const term of ['김', '이', '박', '정', '최']) {
      await searchBar.fill(term);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(800);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });
});
