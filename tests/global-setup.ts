import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './fixtures/users';

// Performs director login once and saves auth state for all subsequent tests
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();

  // Use desktop viewport so schedule header is fully visible
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(`${baseURL}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Username').fill(TEST_USERS.director.username);
  await page.getByLabel('Password').fill(TEST_USERS.director.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect to appointments page
  await page.waitForURL('**/admin/appointments', { timeout: 30000 });

  // [data-menu-button] is always rendered in ScheduleHeaderControls (no async dependency).
  // DO NOT use getByRole('button', { name: /MENU/ }) — accessible name is "MENU expand_more"
  // because the Material Symbols <span> text is included in the computed name.
  await page.locator('[data-menu-button]').waitFor({ state: 'visible', timeout: 30000 });

  // Save auth cookies so all e2e tests reuse the director session
  await context.storageState({ path: './tests/fixtures/auth.json' });

  await browser.close();
}

export default globalSetup;
