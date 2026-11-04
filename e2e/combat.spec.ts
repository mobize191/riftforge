import { test, expect } from '@playwright/test';

// B27 — e2e combat : en se déplaçant, un contact déclenche un combat ; la bannière
// « Au tour de : » est visible et les effets des modules sont affichés en FR.
test('combat : bannière de tour + effets de modules affichés', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();

  // essaie les 4 directions en boucle jusqu'à tomber sur un monstre (contact -> combat)
  const dirs = ['Droite', 'Bas', 'Gauche', 'Haut'];
  let inCombat = false;
  for (let i = 0; i < 24 && !inCombat; i++) {
    await page.getByRole('button', { name: dirs[i % 4] }).click();
    await page.waitForTimeout(200);
    inCombat = await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false);
  }
  expect(inCombat).toBe(true);

  // bannière « Au tour de : » visible (joueur OU compagnon)
  await expect(page.getByText(/Au tour de :/)).toBeVisible();
  // menu Attaquer -> effets des modules en FR (dégâts/soin/bouclier...)
  await page.getByRole('button', { name: /Attaquer/ }).click();
  await expect(page.getByText(/dégâts|soin|bouclier|poison|projection|ralentit|aveugle/i).first()).toBeVisible();
});
