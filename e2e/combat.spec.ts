import { test, expect } from '@playwright/test';

// B27 — e2e combat : parcours déterministe (seed 1) vers un monstre -> combat ;
// la bannière « Au tour de : » est visible et les effets des modules sont affichés en FR.
// Séquence calculée hors ligne (BFS + patrouille déterministe, seed 1, sol 1).
const WALK_TO_MONSTER = ['Droite', 'Droite', 'Droite', 'Droite', 'Droite', 'Droite', 'Droite', 'Droite', 'Bas', 'Bas', 'Bas', 'Bas', 'Bas'];

test('combat : bannière de tour + effets de modules affichés', { timeout: 60000 }, async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();

  for (const d of WALK_TO_MONSTER) {
    await page.getByRole('button', { name: d }).click();
    await page.waitForTimeout(120);
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) break;
  }
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // bannière « Au tour de : » visible (joueur OU compagnon)
  await expect(page.getByText(/Au tour de :/)).toBeVisible();
  // menu Attaquer -> effets des modules en FR (dégâts/soin/bouclier...)
  await page.getByRole('button', { name: /Attaquer/ }).click();
  await expect(page.getByText(/dégâts|soin|bouclier|poison|projection|ralentit|aveugle/i).first()).toBeVisible();
});
