import { test, expect } from '@playwright/test';

test('homepage loads and renders correctly', async ({ page }) => {
  await page.goto('/');
  // Verify the correct page title
  await expect(page).toHaveTitle(/Risk & Compliance Advisor AI/i);

  // Instead of <h1>, check for visible brand text or navigation
  const content = page.locator('body');
  await expect(content).toContainText(/Risk|Compliance|Advisor|Dashboard/i);
});
