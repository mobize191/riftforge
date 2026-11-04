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

  // un clic sur le pavé déplace le joueur d'une case (on essaie les directions jusqu'à trouver
  // une case libre — un mur bloque légitimement)
  const dirs = ['Droite', 'Bas', 'Gauche', 'Haut'];
  let posApres = posAvant;
  for (const d of dirs) {
    await page.getByRole('button', { name: d }).click();
    await page.waitForTimeout(250);
    posApres = await page.locator('text=/Position :/').textContent();
    if (posApres !== posAvant) break;
  }
  expect(posApres).not.toBe(posAvant);

  // un deuxième déplacement (dans une autre direction libre)
  for (const d of dirs) {
    await page.getByRole('button', { name: d }).click();
    await page.waitForTimeout(250);
    const p2 = await page.locator('text=/Position :/').textContent();
    if (p2 !== posApres) {
      posApres = p2;
      break;
    }
  }
  expect(posApres).not.toBe(posAvant);
});

test('sauvegarde : recharger la page restaure la position', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  for (const d of ['Droite', 'Bas', 'Gauche', 'Haut']) {
    await page.getByRole('button', { name: d }).click();
    await page.waitForTimeout(250);
  }
  const pos = await page.locator('text=/Position :/').textContent();

  await page.reload();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  expect(await page.locator('text=/Position :/').textContent()).toBe(pos);
});

// R9-05 — parcours e2e des boutons export/import de l'écran titre.
test('écran titre : boutons Télécharger la save / Charger un fichier présents', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Télécharger la save' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Charger un fichier' })).toBeVisible();
  await expect(page.getByLabel('Fichier de sauvegarde')).toBeAttached();
});
