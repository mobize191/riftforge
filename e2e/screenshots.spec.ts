import { test, expect, type Page } from '@playwright/test';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, SAVE_KEY } from '../src/core/save/save';

// R10-08 — captures d'écran de preuve commitées (docs/SCREENSHOTS-R10/) :
// écran titre, Forge complète, carte biome 1 AVEC compagnon en équipe,
// combat avec jauge d'énergie + menu Modules ouvert (coûts visibles).

const SHOTS = 'docs/SCREENSHOTS-R10';
test.setTimeout(120000);

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

async function marcherJusquAuCombat(page: Page): Promise<void> {
  let horiz = 'Droite';
  for (let i = 0; i < 400; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return;
    if ((await bouger(page, horiz)) === null) {
      if ((await bouger(page, 'Bas')) === null) await bouger(page, 'Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
}

test('captures de preuve R10-08', async ({ page }) => {
  // 1) Écran titre
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/12-titre.png` });

  // 2) Carte du biome 1 AVEC compagnon en équipe (save injectée : mousse en équipe)
  let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
  s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
  await page.addInitScript(
    ([key, json]) => window.localStorage.setItem(key, json),
    [SAVE_KEY, serialize(s)],
  );
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/13-carte-compagnon-equipe.png` });

  // 3) Combat avec jauge + menu Modules ouvert (coûts visibles)
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Énergie : \d+\/\d+/)).toBeVisible();
  await expect(page.getByText(/Compagnon :/)).toBeVisible(); // compagnon présent
  await page.getByRole('button', { name: /^Modules/ }).click();
  await expect(page.getByRole('button', { name: /énergie$/ }).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/14-combat-modules-ouverts.png` });

  // 4) Forge complète (plan, Maison, Labo, écurie) en full page
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Quitter la Faille' }).click();
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Écurie/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Maison du héros/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Labo/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Plan de la Forge/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/15-forge-complete.png`, fullPage: true });
});
