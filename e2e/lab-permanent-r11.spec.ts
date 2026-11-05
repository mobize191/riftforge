import { test, expect, type Page } from '@playwright/test';

// R11-05 — Labo permanent (390 px) : achat d'une amélioration PERMANENTE à la Forge,
// visible en combat après retour (coût d'énergie réduit), sections PERMANENT vs CETTE RUN.
// Preuves : captures docs/SCREENSHOTS-R11/20-labo-permanent.png, 21-combat-energie-reduite.png.

const SHOTS = 'docs/SCREENSHOTS-R11';
test.setTimeout(420000);

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
  await page.waitForTimeout(110);
  const apres = await lirePos(page);
  return apres === avant ? null : apres;
}

async function marcherJusquAuCombat(page: Page): Promise<boolean> {
  let horiz = 'Droite';
  for (let i = 0; i < 500; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return true;
    const horizBouge = await bouger(page, horiz);
    if (horizBouge === null) {
      if ((await bouger(page, 'Bas')) === null) await bouger(page, 'Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
  return false;
}

/** Descente (seed aléatoire) + marche jusqu'au combat ; retry si la carte est défavorable. */
async function descendreJusquAuCombat(page: Page): Promise<void> {
  for (let essai = 0; essai < 4; essai++) {
    await page.getByRole('button', { name: 'Redescendre' }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    if (await marcherJusquAuCombat(page)) return;
    // pas de combat trouvé : on abandonne la run et on retente
    await page.getByRole('button', { name: 'Quitter la Faille' }).click();
    await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  }
  throw new Error('combat introuvable après 4 descentes');
}

test('Labo permanent : achat persistant, appliqué en combat après retour à la Forge', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // Save avec ressources de biomes profonds (mercurium) pour acheter au Labo.
  await page.evaluate(() => {
    const ls = window.localStorage;
    const raw = ls.getItem('riftforge-save');
    if (!raw) throw new Error('save absente');
    const file = JSON.parse(raw);
    file.state.forge.lingots = 20;
    file.state.forge.mercurium = 10;
    file.state.forge.optifibre = 5;
    const origSet = Storage.prototype.setItem;
    origSet.call(ls, 'riftforge-save', JSON.stringify(file));
    Storage.prototype.setItem = function () {};
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Quitter la Faille' }).click();
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();

  // Section Labo scindée PERMANENT vs CETTE RUN.
  await expect(page.getByText(/PERMANENT — conservé entre les runs/)).toBeVisible();
  await expect(page.getByText(/CETTE RUN — codex et recettes de la run/)).toBeVisible();
  // Achat de « Canalisation I » (-1 énergie palier 1, permanent).
  await page.getByRole('button', { name: /^Canalisation I —/ }).click();
  await expect(page.getByRole('button', { name: /^✓ Canalisation I / })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/20-labo-permanent.png`, fullPage: true });

  // Retour en run -> combat : le bouton module palier 1 affiche le coût réduit (1 énergie au lieu de 2).
  await descendreJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await page.getByRole('button', { name: /Modules \(\d+\)/ }).click();
  await expect(page.getByRole('button', { name: /— 1 énergie/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/21-combat-energie-reduite.png` });
});
