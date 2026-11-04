import { test, expect } from '@playwright/test';

// R9-04 — Responsive final : la même parcours jouable en 390 px (téléphone, config par
// défaut) et en 2560 px (Quad HD) : hit-zones >= 44 px, HUD lisible, canvas présent.

test.describe('responsive 2560px (Quad HD)', () => {
  test.use({ viewport: { width: 2560, height: 1440 } });

  test('titre -> descente -> carte rendue, pavé tactile avec hit-zones >= 44 px', async ({ page }) => {
    await page.goto('/riftforge/');
    await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
    const btn = page.getByRole('button', { name: 'Nouvelle descente' });
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await btn.click();
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.locator('text=/Position :/')).toBeVisible();

    // hit-zones du pavé tactile >= 44 px en large aussi
    for (const d of ['Haut', 'Bas', 'Gauche', 'Droite']) {
      const b = await page.getByRole('button', { name: d }).boundingBox();
      expect(b).not.toBeNull();
      expect(b!.width).toBeGreaterThanOrEqual(44);
      expect(b!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
