import { Page } from '@playwright/test';

/**
 * Helper function to login to the application
 * Uses XPORTAL_EMAIL and XPORTAL_PASSWORD from environment variables
 * @param page - Playwright page object
 */
export const login = async (page: Page): Promise<void> => {
  const email = process.env.XPORTAL_EMAIL;
  const password = process.env.XPORTAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'XPORTAL_EMAIL and XPORTAL_PASSWORD must be set in environment variables'
    );
  }

  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation after login (usually redirects to dashboard)
  await page.waitForURL('**/dashboard', { timeout: 10000 });
};
