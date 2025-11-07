import { test, expect } from '@playwright/test';

test('auth page loads and form is visible', async ({ page }) => {
  await page.goto('/auth');

  // Check that the auth page loaded properly
  await expect(page).toHaveTitle(/Risk & Compliance Advisor AI/i);

  // Check for login fields
  await expect(page.locator('input[type="email"], input[name*="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"], input[name*="password"]')).toBeVisible();

  // Check for a sign-in button
  const button = page.getByRole('button', { name: /sign in|login|continue/i });
  await expect(button).toBeVisible();
});
