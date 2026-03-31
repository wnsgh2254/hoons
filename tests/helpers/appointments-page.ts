import type { Page } from '@playwright/test';

/**
 * Navigate to /admin/appointments and wait until the schedule grid is FULLY interactive:
 *
 * 1. [data-menu-button]  → schedule header rendered (no async dependency)
 * 2. "로딩 중..." hidden  → loadingDesignerAvailability became false
 *                           During loading, availableDesignerIds is empty → all designers
 *                           are marked isDesignerOff=true → empty slots are NOT rendered.
 *                           We MUST wait for this spinner to disappear before touching the grid.
 *
 * Note: getByRole('button', { name: /MENU/ }) FAILS because the accessible name is
 * "MENU expand_more" (Material Symbols span text is included). Use [data-menu-button].
 */
export async function gotoAppointmentsAndWaitReady(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/admin/appointments', { waitUntil: 'domcontentloaded' });

  // Step 1: header is rendered
  await page.locator('[data-menu-button]').waitFor({ state: 'visible', timeout: 30000 });

  // Step 2: designer availability loading overlay disappears.
  // If it was never shown, waitFor('hidden') resolves immediately — safe either way.
  await page
    .locator('span', { hasText: '로딩 중...' })
    .waitFor({ state: 'hidden', timeout: 60000 });

  // Step 3: confirm at least one empty slot exists (means designers are available today)
  await page
    .locator('#schedule-scroll-container div.absolute.left-0.right-0.z-0.select-none')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 })
    .catch(() => {
      // No empty slots today (all booked / all designers off) — tests will skip gracefully
    });
}

/**
 * Open the "예약 등록" (New Booking) modal by mousedown-ing on an empty grid slot.
 *
 * Must be called AFTER gotoAppointmentsAndWaitReady (loading overlay gone).
 * Empty slots (div.absolute.left-0.right-0.z-0.select-none) are rendered only when:
 *  - availableDesignerIds is populated (loadingDesignerAvailability=false)
 *  - The slot has no booking and the designer is not off
 */
export async function openNewBookingModalFromSchedule(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });

  // Wait for loading overlay to be gone
  await page
    .locator('span', { hasText: '로딩 중...' })
    .waitFor({ state: 'hidden', timeout: 60000 });

  const scrollContainer = page.locator('#schedule-scroll-container');
  await scrollContainer.waitFor({ state: 'visible', timeout: 20000 });

  const slots = scrollContainer.locator('div.absolute.left-0.right-0.z-0.select-none');

  // Wait for at least one slot to be in the DOM
  await slots.first().waitFor({ state: 'attached', timeout: 15000 });

  const count = await slots.count();
  if (count === 0) {
    throw new Error(
      '빈 예약 슬롯이 없습니다 (오늘 모든 슬롯이 예약 완료이거나 디자이너 휴무).\n' +
      '다른 날짜를 선택하거나 test seed 데이터를 확인하세요.',
    );
  }

  // Dispatch mousedown directly (bypasses CSS overlay) — React onMouseDown handler
  for (let i = 0; i < Math.min(count, 60); i++) {
    const slot = slots.nth(i);
    const style = await slot.getAttribute('style').catch(() => '');
    // Skip slots where pointerEvents is explicitly none (restricted/menu-open)
    if (style?.includes('pointer-events: none')) continue;

    await slot.dispatchEvent('mousedown', { bubbles: true, cancelable: true });

    const heading = page.getByRole('heading', { name: '예약 등록' });
    if (await heading.isVisible({ timeout: 2500 }).catch(() => false)) {
      return;
    }
  }

  throw new Error(
    '"예약 등록" 모달이 열리지 않았습니다.\n' +
    '빈 슬롯 mousedown 이벤트가 모두 막혔거나, 슬롯이 모두 제한 상태일 수 있습니다.',
  );
}
