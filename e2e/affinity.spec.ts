import { test, expect, type Page } from '@playwright/test';

// R10-03 (D2) — e2e : « Faiblesse ! » / « Résisté ! » visibles dans le log de combat réel.
// Premier combat (seed 1) : Amas de spores (faible EAU), Mousse sporulée (résistante EAU).
// Orbes de départ (seed 1) : eau, air, terre -> « Jet sous pression » (eau) est solo-castable.

test.setTimeout(180000);

async function lirePos(page: Page): Promise<string | null> {
  try {
    const t = await page.getByText(/Position/).first().innerText({ timeout: 1500 });
    const m = t.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    return m ? `${m[1]},${m[2]}` : null;
  } catch {
    return null;
  }
}

async function bouger(page: Page, dir: string): Promise<string | null> {
  const avant = await lirePos(page);
  try {
    await page.getByRole('button', { name: dir }).click({ timeout: 1500 });
  } catch {
    return null;
  }
  await page.waitForTimeout(60);
  const apres = await lirePos(page);
  return apres === avant ? null : apres;
}

async function marcherJusquAuCombat(page: Page): Promise<void> {
  let horiz = 'Droite';
  for (let i = 0; i < 900; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return;
    if ((await bouger(page, horiz)) === null) {
      if ((await bouger(page, 'Bas')) === null) await bouger(page, 'Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
}

test('combat réel : retours d\'affinité Faiblesse ! / Résisté ! dans le log', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // Cible : Amas de spores (sélectionné par défaut, faible à l'eau).
  await page.getByRole('button', { name: /^Modules/ }).click();
  await page.getByRole('button', { name: /Jet sous pression/ }).first().click();
  await page.waitForTimeout(250);
  await expect(page.getByText(/Faiblesse !/)).toBeVisible();

  // Cible suivante : la Mousse sporulée (résistante à l'eau) -> Résisté !
  await page.locator('li', { hasText: 'Mousse' }).first().getByRole('button', { name: /Sélectionner/ }).click();
  await page.getByRole('button', { name: /^Modules/ }).click();
  await page.getByRole('button', { name: /Jet sous pression/ }).first().click();
  await page.waitForTimeout(250);
  await expect(page.getByText(/Résisté !/)).toBeVisible();
  await page.screenshot({ path: 'docs/SCREENSHOTS-R10/10-affinites-log.png' });
});
