import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/users';

// Login tests run WITHOUT saved auth state (fresh browser context)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('로그인 페이지 테스트 (/admin/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('1.1 로그인 페이지 로드 시 Username/Password 폼이 표시되어야 함', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Staff Login' })).toBeVisible();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('1.3 잘못된 자격증명 입력 시 에러 메시지가 표시되어야 함', async ({ page }) => {
    await page.getByLabel('Username').fill(TEST_USERS.invalid.username);
    await page.getByLabel('Password').fill(TEST_USERS.invalid.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Invalid username or password')).toBeVisible();
    await expect(page).toHaveURL('/admin/login');
  });

  test('1.4 Director 자격증명으로 로그인 시 /admin/appointments로 이동해야 함', async ({ page }) => {
    await page.getByLabel('Username').fill(TEST_USERS.director.username);
    await page.getByLabel('Password').fill(TEST_USERS.director.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/.*admin\/appointments/, { timeout: 10000 });
  });

  test('1.5 빈 필드 제출 시 유효성 검사가 동작해야 함', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();

    // HTML5 required validation prevents submission — still on login page
    await expect(page).toHaveURL('/admin/login');
  });

  test('1.2 이미 로그인된 상태로 접근 시 /admin/appointments로 리다이렉트해야 함', async ({ page }) => {
    // Login first to get a session
    await page.getByLabel('Username').fill(TEST_USERS.director.username);
    await page.getByLabel('Password').fill(TEST_USERS.director.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/.*admin\/appointments/);

    // Navigate back to login — should redirect away
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/.*admin\/appointments/, { timeout: 5000 });
  });
});
