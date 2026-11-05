import { test, expect, type Page } from '@playwright/test';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, SAVE_KEY } from '../src/core/save/save';

// R10-02 (D1) — e2e énergie de combat (IHM réelle, 390 px) :
// 1. jauge d'énergie visible dans le HUD de combat, coûts affichés sur les boutons ;
// 2. refus réel « Pas assez d'énergie — +X/tour » (save injectée : Déflagration tier 3,
//    PV élevés pour survivre aux rounds).

test.setTimeout(240000);

const DIRS = ['Droite', 'Bas', 'Gauche', 'Haut'] as const;

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

test('combat : jauge énergie + coûts sur les boutons', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // jauge visible avec valeur + regen
  await expect(page.getByText(/Énergie : \d+\/\d+ \(\+\d+\/tour\)/)).toBeVisible();
  // coût affiché sur le bouton d'attaque
  await expect(page.getByRole('button', { name: /Attaquer.*— 1 énergie/ })).toBeVisible();
  // coûts affichés sur les modules (menu Modules)
  await page.getByRole('button', { name: /^Modules/ }).click();
  await expect(page.getByRole('button', { name: /énergie$/ }).first()).toBeVisible();
});

test('combat : refus réel « Pas assez d\'énergie » (Plaque blindée tier 2 en boucle)', async ({ page }) => {
  // Save injectée : run en cours, 200 PV, module Plaque blindée (tier 2, coût 5 > regen 4).
  // Bouclier = aucun kill possible -> le combat dure, l'énergie drain à -1/round -> refus inévitable.
  let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
  s = {
    ...s,
    run: {
      ...s.run!,
      playerHp: 200,
      playerMaxHp: 200,
      modules: [{ id: 'plaque-blindee' }],
    },
  };
  await page.addInitScript(
    ([key, json]) => window.localStorage.setItem(key, json),
    [SAVE_KEY, serialize(s)],
  );
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // Lancer Plaque blindée à répétition : le drain finit par passer sous le coût -> refus.
  let refus = false;
  for (let i = 0; i < 16; i++) {
    if (await page.getByText(/Pas assez d'énergie/).first().isVisible().catch(() => false)) {
      refus = true;
      break;
    }
    if (await page.getByRole('heading', { name: /VICTOIRE/ }).isVisible().catch(() => false)) break;
    if (await page.getByText('RUN TERMINÉE').isVisible().catch(() => false)) break;
    await page.getByRole('button', { name: /^Modules/ }).click().catch(() => {});
    await page.waitForTimeout(120);
    const cast = page.getByRole('button', { name: /Plaque blindée/ });
    if (await cast.isVisible().catch(() => false)) {
      await cast.first().click();
      await page.waitForTimeout(250);
    } else break;
  }
  expect(refus, 'le refus « Pas assez d\'énergie — +4/tour » doit apparaître dans le log').toBe(true);
  await page.screenshot({ path: 'docs/SCREENSHOTS-R10/09-refus-energie.png' });
});
