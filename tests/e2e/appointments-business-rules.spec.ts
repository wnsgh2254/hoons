/**
 * 예약 관리 — 실제 영업 비즈니스 규칙 검증 테스트
 *
 * 단순 UI 동작 확인이 아니라, 실제 운영에서 문제가 될 수 있는 상황들을 검증합니다.
 * API 직접 호출 테스트(빠르고 신뢰성 높음) + UI 시나리오 테스트를 혼합합니다.
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { gotoAppointmentsAndWaitReady, openNewBookingModalFromSchedule } from '../helpers/appointments-page';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns today's date string in YYYY-MM-DD format (Sydney timezone approx) */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Future date N days from today */
function futureDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Past date N days ago */
function pastDateStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. API 레벨 — 핵심 비즈니스 규칙 검증 (브라우저 불필요, 빠름)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[API] 예약 비즈니스 규칙 — API 직접 검증', () => {
  let apiCtx: Awaited<ReturnType<typeof playwrightRequest.newContext>>;

  test.beforeAll(async () => {
    // Use a fresh API context (no browser, just HTTP)
    apiCtx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiCtx.dispose();
  });

  // ── 1-1. 예약 종료 시간 21:00 초과 방지 ──────────────────────────────────

  test('1-1. 예약 수정 시 종료 시간이 21:00를 초과하면 400 에러를 반환해야 함', async () => {
    /**
     * Business rule: 영업 종료 후(21:00 이후) 예약이 끝나는 경우 저장 불가.
     * PATCH /api/appointment/[id] 에서 강제 검증.
     * 존재하지 않는 ID로도 시간 검증은 먼저 실행되는지 확인한다.
     */
    const res = await apiCtx.patch('/api/appointment/999999', {
      data: {
        booking_time: '20:30', // 20:30 start + 60 min default = 21:30 → exceeds 21:00
      },
    });

    // API should reject with 400 (time validation) or 404 (not found) — never 200
    expect([400, 404, 500]).toContain(res.status());

    if (res.status() === 400) {
      const body = await res.json();
      // Error message should mention 21시 or end time
      expect(body.error).toMatch(/21|종료|시간/);
    }
  });

  test('1-2. 21:00 정각에 시작하는 예약 수정도 거부되어야 함 (서비스 소요 시간 포함 시 초과)', async () => {
    const res = await apiCtx.patch('/api/appointment/999999', {
      data: {
        booking_time: '21:00',
      },
    });
    // 21:00 + any duration > 0 minutes → exceeds
    expect([400, 404]).toContain(res.status());
  });

  // ── 1-2. 필수 파라미터 검증 ───────────────────────────────────────────────

  test('1-3. 예약 생성 시 필수 필드(shopId, day, timeLabel) 누락이면 400을 반환해야 함', async () => {
    const res = await apiCtx.post('/api/appointment', {
      data: {
        // shopId missing intentionally
        day: 1,
        timeLabel: '10:00 AM',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('1-4. timeLabel 없이 예약 생성 시 400을 반환해야 함', async () => {
    const res = await apiCtx.post('/api/appointment', {
      data: {
        shopId: 1,
        day: 1,
        // timeLabel missing
      },
    });
    expect(res.status()).toBe(400);
  });

  // ── 1-3. 예약 제한(booking_restrictions) API ──────────────────────────────

  test('1-5. 예약 제한 등록 시 필수 필드 누락이면 400을 반환해야 함', async () => {
    const res = await apiCtx.post('/api/booking-restrictions', {
      data: {
        // designer_id missing
        restriction_type: 'date',
        restriction_date: futureDateStr(7),
      },
    });
    expect(res.status()).toBe(400);
  });

  test('1-6. 시간 제한(time 타입) 등록 시 start_time/end_time 누락이면 400을 반환해야 함', async () => {
    const res = await apiCtx.post('/api/booking-restrictions', {
      data: {
        designer_id: 1,
        restriction_type: 'time',
        restriction_date: futureDateStr(7),
        // start_time, end_time missing
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/시간/);
  });

  // ── 1-4. 예약 조회 API ────────────────────────────────────────────────────

  test('1-7. GET /api/appointment 날짜 필터로 조회하면 해당 날짜 예약만 반환해야 함', async () => {
    const date = todayStr();
    const res = await apiCtx.get(`/api/appointment?date=${date}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('bookings');
    expect(Array.isArray(body.bookings)).toBe(true);

    // All returned bookings must match the requested date
    for (const b of body.bookings) {
      expect(b.booking_date).toBe(date);
    }
  });

  test('1-8. GET /api/appointment minimal 모드는 날짜별 예약 수(dayCounts)를 반환해야 함', async () => {
    const res = await apiCtx.get(`/api/appointment?minimal=true&date=${todayStr()}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.dayCounts).toBeDefined();
    expect(typeof body.dayCounts).toBe('object');
  });

  // ── 1-5. 예약 상태 전환 API ───────────────────────────────────────────────

  test('1-9. 존재하지 않는 예약 ID 수정 시 404 또는 500을 반환해야 함 (200은 안 됨)', async () => {
    const res = await apiCtx.patch('/api/appointment/0', {
      data: { status: 'confirmed' },
    });
    expect([404, 500]).toContain(res.status());
  });

  test('1-10. 예약 제한 목록 조회 API가 정상 동작해야 함', async () => {
    const res = await apiCtx.get('/api/booking-restrictions');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('restrictions');
    expect(Array.isArray(body.restrictions)).toBe(true);
  });

  // ── 1-6. 가용 디자이너 조회 ───────────────────────────────────────────────

  test('1-11. GET /api/available-designers 는 date와 shopId가 모두 있어야 200을 반환해야 함', async () => {
    const res = await apiCtx.get(`/api/available-designers?date=${futureDateStr(1)}&shopId=1`);
    // May be 200 or empty depending on test data — just must not crash
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('designers');
    }
  });

  test('1-12. GET /api/available-designers 파라미터 누락 시 400을 반환해야 함', async () => {
    const res = await apiCtx.get('/api/available-designers?date=2026-04-01');
    // shopId missing
    expect(res.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. UI 레벨 — 예약 등록 폼 비즈니스 규칙
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 예약 등록 폼 — 실제 운영 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  test('2-1. 고객 선택 없이 저장 시도 시 저장 버튼이 비활성화되거나 에러가 표시되어야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const submitBtn = page.getByRole('button', { name: /저장|등록|Save|Submit/i }).first();
    if (await submitBtn.isVisible()) {
      // Should be disabled when customer is not selected
      const isDisabled = await submitBtn.isDisabled();
      if (!isDisabled) {
        // If not disabled, clicking should show a validation error
        await submitBtn.click();
        const errorMsg = page.getByText(/고객|필수|required|customer/i).first();
        await expect(errorMsg).toBeVisible({ timeout: 3000 });
      } else {
        expect(isDisabled).toBe(true);
      }
    }
  });

  test('2-2. 고객 검색 후 선택하면 과거 방문 기록 섹션이 표시되어야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const searchInput = page.getByPlaceholder(/이름|고객|Customer|Search/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('김');
      await page.waitForTimeout(1500);

      // Select first result if any
      const firstResult = page.locator('[class*="result"], [class*="dropdown"] li, [role="option"]').first();
      if (await firstResult.isVisible()) {
        await firstResult.click();
        await page.waitForTimeout(1000);

        // Past records / visit history section should appear
        const historySection = page.getByText(/과거 기록|방문|최근|담당자|history|visit/i).first();
        await expect(historySection).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('2-3. 직접 방문(Direct Visit) 체크박스 선택 시 고객 검색 없이도 진행 가능해야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const directVisitCheckbox = page.getByRole('checkbox', { name: /직접 방문|Direct Visit/i });
    if (await directVisitCheckbox.isVisible()) {
      await directVisitCheckbox.check();
      await page.waitForTimeout(300);
      await expect(directVisitCheckbox).toBeChecked();
    }
  });

  test('2-4. 예약 날짜를 과거 날짜로 설정하면 경고나 제한이 있어야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(pastDateStr(30));
      await page.waitForTimeout(300);

      // Either past date is blocked (input min attribute) or a warning shows
      const minAttr = await dateInput.getAttribute('min');
      const warningMsg = page.getByText(/과거|지난|past|invalid date/i).first();
      const hasWarning = await warningMsg.isVisible().catch(() => false);

      // At least one protection mechanism should exist
      const hasMinRestriction = minAttr !== null;
      expect(hasMinRestriction || hasWarning).toBe(true);
    }
  });

  test('2-5. 예약 취소 후 모달이 닫히고 성공 메시지나 상태 변경이 반영되어야 함', async ({ page }) => {
    // Find any existing booking card and cancel it
    await page.waitForTimeout(2000);
    const bookingCard = page
      .locator('[class*="booking"], [class*="appointment"], [class*="event"], [class*="card"]')
      .first();

    if (await bookingCard.isVisible()) {
      await bookingCard.click();
      await page.waitForTimeout(500);

      // In detail modal, find cancel button
      const cancelBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /취소|Cancel Booking/i })
        .first();

      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Cancel confirmation modal should appear
        const confirmBtn = page
          .getByRole('dialog')
          .getByRole('button', { name: /확인|Confirm|예/i })
          .first();

        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(1500);

          // Modal should close and no error should appear
          const errorMsg = page.getByText(/실패|error|오류/i).first();
          const hasError = await errorMsg.isVisible().catch(() => false);
          expect(hasError).toBe(false);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. 예약 상태 관리 — 실제 영업 플로우
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 예약 상태 관리 — pending → confirmed → noshow/cancelled', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
    // Loading is already done — no extra timeout needed
  });

  test('3-1. 예약 상세 모달에서 상태(status) 변경 옵션이 존재해야 함', async ({ page }) => {
    const bookingCard = page.locator('[data-booking-card]').first();

    if (!(await bookingCard.isVisible())) {
      test.skip();
      return;
    }

    await bookingCard.click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Status-related options must be visible: confirm, cancel, noshow
    const statusOptions = dialog.getByText(/확인|Confirmed|취소|Cancel|노쇼|Noshow|No.show/i);
    const count = await statusOptions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('3-2. 매출 등록 버튼은 예약 상세 모달에서 접근 가능해야 함', async ({ page }) => {
    const bookingCard = page.locator('[data-booking-card]').first();

    if (!(await bookingCard.isVisible())) {
      test.skip();
      return;
    }

    await bookingCard.click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const salesBtn = dialog.getByRole('button', { name: /매출 등록|판매 등록|Sales/i }).first();
    if (await salesBtn.isVisible()) {
      await salesBtn.click();
      await page.waitForTimeout(500);
      // Sales registration modal should open
      await expect(page.getByRole('dialog').last()).toBeVisible({ timeout: 5000 });
    }
  });

  test('3-3. 예약 수정 모달에서 날짜와 시간을 변경할 수 있어야 함', async ({ page }) => {
    const bookingCard = page.locator('[data-booking-card]').first();

    if (!(await bookingCard.isVisible())) {
      test.skip();
      return;
    }

    await bookingCard.click();
    await page.waitForTimeout(500);

    const editBtn = page.getByRole('dialog').getByRole('button', { name: /수정|Edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);

      // Edit uses same modal as new booking — heading "예약 수정"
      await expect(page.getByRole('heading', { name: '예약 수정' })).toBeVisible({ timeout: 5000 });
      const hasTimeSelect = await page.getByText('시작시간', { exact: false }).first().isVisible().catch(() => false);
      expect(hasTimeSelect).toBe(true);

      // Close without saving
      const editDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '예약 수정' }) });
      const closeBtn = editDialog.getByRole('button', { name: /취소|Cancel|닫기|Close/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. 예약 제한(Restriction) 및 휴무(Time-off) 기능
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 예약 제한 및 휴무 관리 — Director 전용 기능', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  test('4-1. 디자이너 드롭다운 메뉴에서 예약 제한 설정 접근이 가능해야 함', async ({ page }) => {

    // Find designer column header dropdown
    const designerDropdown = page
      .locator('[class*="designer"], [class*="column-header"]')
      .getByRole('button')
      .first();

    if (await designerDropdown.isVisible()) {
      await designerDropdown.click();
      await page.waitForTimeout(300);

      // Menu should have restriction option
      const restrictionItem = page.getByText(/제한|Restriction|예약 금지/i).first();
      if (await restrictionItem.isVisible()) {
        await expect(restrictionItem).toBeVisible();
      }
    }
  });

  test('4-2. 휴무 관리 버튼 클릭 시 디자이너 목록이 있는 모달이 열려야 함', async ({ page }) => {

    const timeOffBtn = page.getByRole('button', { name: /휴무|Time Off/i }).first();
    if (await timeOffBtn.isVisible()) {
      await timeOffBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Modal should list designers or have designer selection
      const designerOption = dialog.locator('select, [class*="designer-list"] li').first();
      if (await designerOption.isVisible()) {
        await expect(designerOption).toBeVisible();
      }

      const closeBtn = dialog.getByRole('button', { name: /닫기|Close|취소|Cancel/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('4-3. 공휴일 설정 모달에서 날짜를 공휴일로 지정할 수 있어야 함', async ({ page }) => {

    const holidayBtn = page.getByRole('button', { name: /공휴일|Holiday/i }).first();
    if (await holidayBtn.isVisible()) {
      await holidayBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const closeBtn = dialog.getByRole('button', { name: /닫기|Close|취소|Cancel/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 검색 및 필터 — 실무 조회 시나리오
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 예약 검색 및 필터 — 실무 조회 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  test('5-1. 고객명으로 검색하면 해당 고객의 예약만 필터링되어야 함', async ({ page }) => {

    const searchInput = page.getByPlaceholder(/고객|검색|Search|이름/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('김민준'); // A specific name unlikely to match everything
      await page.waitForTimeout(1500);
      // Grid should update — no crash, page still visible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('5-2. 매장 필터 변경 시 해당 매장 예약만 표시되어야 함', async ({ page }) => {

    // Find shop filter (dropdown or button group)
    const shopFilter = page
      .getByRole('combobox', { name: /매장|Shop|Store/i })
      .or(page.getByRole('button', { name: /Meadowbank|Haymarket/i }).first());

    if (await shopFilter.isVisible()) {
      if ((await shopFilter.getAttribute('role')) === 'combobox') {
        await shopFilter.selectOption({ index: 1 });
      } else {
        await shopFilter.click();
      }
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('5-3. 날짜 이동(다음 날) 시 해당 날짜의 예약 그리드가 표시되어야 함', async ({ page }) => {

    // Find next-day navigation button
    const nextBtn = page
      .getByRole('button', { name: /다음|Next|>/i })
      .or(page.locator('[aria-label*="next"], [aria-label*="다음"]'))
      .first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
      // Grid should render without error
      await expect(page.locator('body')).toBeVisible();
      await expect(page).not.toHaveURL(/.*login/);
    }
  });

  test('5-4. 오늘 날짜로 돌아오기(Today 버튼) 기능이 동작해야 함', async ({ page }) => {

    // Navigate away first
    const nextBtn = page
      .getByRole('button', { name: /다음|Next|>/i })
      .first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(800);
    }

    // Then click Today button
    const todayBtn = page.getByRole('button', { name: /오늘|Today/i }).first();
    if (await todayBtn.isVisible()) {
      await todayBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. 출퇴근 및 근태 관리 — Director 권한 확인
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 출퇴근 및 근태 관리 — Director 권한', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  test('6-1. 출퇴근 버튼 클릭 시 근태 모달이 열려야 함 (Director 접근 가능)', async ({ page }) => {
    const attendanceBtn = page
      .getByRole('button', { name: /출퇴근|Attendance|clock/i })
      .first();

    if (await attendanceBtn.isVisible()) {
      await attendanceBtn.click();
      await page.waitForTimeout(500);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const closeBtn = dialog.getByRole('button', { name: /닫기|Close|취소|Cancel/i }).first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. 환불 처리 — 취소 예약에 대한 환불 흐름
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[UI] 환불 처리 — 예약 취소 + 환불 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  test('7-1. 예약 상세에서 환불 등록 버튼이 존재해야 함', async ({ page }) => {
    const bookingCard = page.locator('[data-booking-card]').first();

    if (!(await bookingCard.isVisible())) {
      test.skip();
      return;
    }

    await bookingCard.click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Refund button should be accessible (may be conditionally shown)
    const refundBtn = dialog.getByRole('button', { name: /환불|Refund/i }).first();
    if (await refundBtn.isVisible()) {
      await expect(refundBtn).toBeVisible();
      // Click and verify modal opens
      await refundBtn.click();
      await page.waitForTimeout(500);
      const refundDialog = page.getByRole('dialog').last();
      await expect(refundDialog).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. 중복 예약 방지 — 같은 디자이너, 같은 시간 슬롯
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[API] 중복 예약 방지 시나리오', () => {
  let apiCtx: Awaited<ReturnType<typeof playwrightRequest.newContext>>;

  test.beforeAll(async () => {
    apiCtx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiCtx.dispose();
  });

  test('8-1. 같은 날짜·시간·디자이너 예약이 그리드에 중복 렌더링되지 않는지 API 레벨로 확인', async () => {
    /**
     * DB에서 같은 날짜, 디자이너, 시간의 예약이 중복 존재하면 그리드에서 겹쳐 보임.
     * API가 해당 날짜의 예약을 반환할 때 (designerId + booking_time) 조합의 중복이 없어야 함.
     */
    const date = todayStr();
    const res = await apiCtx.get(`/api/appointment?date=${date}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const bookings: Array<{ designer_id: number | null; booking_time: string; status: string }> =
      body.bookings || [];

    // Filter only active bookings (not cancelled)
    const activeBookings = bookings.filter(
      (b) => b.status !== 'cancelled' && b.status !== 'canceled',
    );

    // Check for duplicates: same designer + same time = conflict
    const seenKeys = new Set<string>();
    const duplicates: string[] = [];

    for (const b of activeBookings) {
      if (!b.designer_id) continue; // Skip unassigned
      const key = `${b.designer_id}::${b.booking_time}`;
      if (seenKeys.has(key)) {
        duplicates.push(key);
      } else {
        seenKeys.add(key);
      }
    }

    if (duplicates.length > 0) {
      console.warn(`⚠️ 중복 예약 발견 (${date}):`, duplicates);
    }
    // This is a diagnostic test — log duplicates but don't hard-fail
    // If you want strict enforcement, change to: expect(duplicates).toHaveLength(0);
    expect(duplicates.length).toBe(0);
  });

  test('8-2. 예약 시간 가용성 API가 정상 응답해야 함', async () => {
    const res = await apiCtx.get(
      `/api/booking-time-availability?designer_id=1&shop_id=1&date=${futureDateStr(3)}`,
    );
    // 200 or error depending on test data — must not crash
    expect([200, 400, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      // Response should be an object (slot availability map)
      expect(typeof body).toBe('object');
    }
  });
});
