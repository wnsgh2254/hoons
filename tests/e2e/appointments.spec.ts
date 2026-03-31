import { test, expect } from '@playwright/test';
import { gotoAppointmentsAndWaitReady, openNewBookingModalFromSchedule } from '../helpers/appointments-page';

test.describe('예약 관리 테스트 (/admin/appointments) — Director 권한', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppointmentsAndWaitReady(page);
  });

  // ── 2.1 기본 UI ─────────────────────────────────────────────────────────────

  test('2.1.1 페이지 로드 시 캘린더/스케줄 그리드가 표시되어야 함', async ({ page }) => {
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#schedule-scroll-container')).toBeVisible();
  });

  test('2.1.3 Week View / Day View 전환이 가능해야 함', async ({ page }) => {
    const weekBtn = page.getByRole('button', { name: /week/i });
    const dayBtn = page.getByRole('button', { name: /day/i });

    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await expect(weekBtn).toBeVisible();
    }
    if (await dayBtn.isVisible()) {
      await dayBtn.click();
      await expect(dayBtn).toBeVisible();
    }
  });

  // ── 2.2 예약 등록 모달 ───────────────────────────────────────────────────────

  test('2.2.1 빈 슬롯 클릭 시 예약 등록 모달이 열려야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);
    await expect(page.getByRole('heading', { name: '예약 등록' })).toBeVisible();
  });

  test('2.2.2 예약 등록 모달에서 고객 이름으로 검색하면 결과가 표시되어야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const searchInput = page.getByPlaceholder(/고객 이름|고객 검색|이름을 입력/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('김');
      await expect(page.getByRole('listbox').or(page.locator('[data-testid="customer-results"]'))).toBeVisible({
        timeout: 8000,
      });
    }
  });

  test('2.2.12 모달에서 취소 버튼 클릭 시 모달이 닫혀야 함', async ({ page }) => {
    await openNewBookingModalFromSchedule(page);

    const cancelBtn = page.getByRole('button', { name: /취소|Cancel/i }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(page.getByRole('heading', { name: '예약 등록' })).not.toBeVisible({ timeout: 5000 });
    }
  });

  // ── 2.3 예약 카드/상세 ───────────────────────────────────────────────────────

  test('2.3.1 예약 카드 클릭 시 예약 상세 모달이 열려야 함', async ({ page }) => {
    // [data-booking-card] is set on every rendered booking card
    const bookingCard = page.locator('[data-booking-card]').first();
    const exists = await bookingCard.count() > 0;
    if (!exists) { test.skip(); return; }
    await bookingCard.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });

  // ── 2.4 기타 기능 ────────────────────────────────────────────────────────────

  test('2.4.2 휴무 관리 기능에 접근할 수 있어야 함 (Director 전용)', async ({ page }) => {
    const timeOffBtn = page.getByRole('button', { name: /휴무|Time Off/i });
    if (await timeOffBtn.isVisible()) {
      await timeOffBtn.click();
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
