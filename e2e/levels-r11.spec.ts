import { test, expect } from '@playwright/test';

// R11-03 (E3) — HUD de run : niveau (max 12) + jauge d'XP visibles, 390 px.
// Preuve : capture docs/SCREENSHOTS-R11/18-hud-xp.png.

const SHOTS = 'docs/SCREENSHOTS-R11';
test.setTimeout(120000);

test('HUD run : niveau /12 et jauge XP visibles', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  // R11-03 (E3) : "Niv 1/12" + jauge XP dans le HUD de run
  await expect(page.getByText(/Niv 1\/12/)).toBeVisible();
  await expect(page.getByText(/XP \d+\/\d+/)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progression XP' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/18-hud-xp.png` });
});
