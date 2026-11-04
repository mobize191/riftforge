import { test, expect } from '@playwright/test';

// Smoke test IHM réelle (Chromium headless, viewport téléphone 390px) :
// titre -> nouvelle descente -> carte Phaser -> pavé tactile déplace le joueur -> sauvegarde.

test('parcours téléphone : titre, descente, déplacement au pavé tactile', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();

  await page.getByRole('button', { name: 'Nouvelle descente' }).click();

  // la carte Phaser est rendue (canvas)
  await expect(page.locator('canvas').first()).toBeVisible();
  // le HUD affiche le sol et la position
  const hud = page.locator('text=/Position :/');
  await expect(hud).toBeVisible();
  const posAvant = await hud.textContent();

  // un clic sur le pavé "Droite" déplace le joueur d'une case
  await page.getByRole('button', { name: 'Droite' }).click();
  await page.waitForTimeout(300);
  const posApres = await page.locator('text=/Position :/').textContent();
  expect(posApres).not.toBe(posAvant);

  // le pavé "Haut" aussi
  await page.getByRole('button', { name: 'Haut' }).click();
  await page.waitForTimeout(300);
  expect(await page.locator('text=/Position :/').textContent()).not.toBe(posApres);
});

test('sauvegarde : recharger la page restaure la position', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Droite' }).click();
  await page.waitForTimeout(300);
  const pos = await page.locator('text=/Position :/').textContent();

  await page.reload();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(await page.locator('text=/Position :/').textContent()).toBe(pos);
});
