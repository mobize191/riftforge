import { test, expect, type Page } from '@playwright/test';

// R11-07 [playtest] — preuves auto (la validation HUMAINE reste à faire, jamais faite par l'agent) :
// 1. parcours complet 390 px (titre -> descente -> combat -> retour Forge) SANS erreur console
//    (les 404 de ressources absentes sont tolérés et listés) + captures de preuve ;
// 2. compagnon d'une 4e famille (vermine) en combat via save injectée + capture.
// Captures : docs/SCREENSHOTS-R11/22..26-*.png.

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

async function fuirCombat(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const fin = page.getByRole('heading', { name: /VICTOIRE|FUITE|RUN TERMINÉ/ });
    if (await fin.isVisible().catch(() => false)) {
      const btn = page.getByRole('button', { name: 'Continuer' });
      if (await btn.isVisible().catch(() => false)) await btn.click();
      return;
    }
    if (!(await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false))) return;
    await page.getByRole('button', { name: /Fuir/ }).first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

test('parcours complet R11 sans erreur console + captures de preuve', async ({ page }) => {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // toléré : 404 de ressources (portraits PNG absents -> fallback code-gen prévu)
    if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) erreurs.push('console.error: ' + m.text());
  });

  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/22-playtest-titre.png` });

  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Niv 1\/12/)).toBeVisible(); // R11-03 : HUD niveau/XP
  await page.screenshot({ path: `${SHOTS}/23-playtest-carte.png` });

  expect(await marcherJusquAuCombat(page)).toBe(true);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/24-playtest-combat.png` });

  await fuirCombat(page);
  if (await page.getByRole('button', { name: 'Entrer à la Forge' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Entrer à la Forge' }).click();
  } else {
    await page.getByRole('button', { name: 'Quitter la Faille' }).click();
  }
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/25-playtest-forge.png`, fullPage: true });

  expect(erreurs).toEqual([]);
});

test('compagnon vermine (4e famille) en combat, 390 px', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // Save patchée : Tisseuse de fil (vermine, palier 2) en équipe + compétences débloquées.
  await page.evaluate(() => {
    const ls = window.localStorage;
    const raw = ls.getItem('riftforge-save');
    if (!raw) throw new Error('save absente');
    const file = JSON.parse(raw);
    file.state.forge.roster = ['tisseuse'];
    file.state.forge.team = ['tisseuse'];
    file.state.forge.bondTier = { tisseuse: 2 };
    file.state.run.companionSkills = { 'fil-coupant': 1, toile: 1 };
    const origSet = Storage.prototype.setItem;
    origSet.call(ls, 'riftforge-save', JSON.stringify(file));
    Storage.prototype.setItem = function () {};
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  expect(await marcherJusquAuCombat(page)).toBe(true);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Compagnon : Tisseuse de fil/)).toBeVisible();
  await page.getByRole('button', { name: /^Compagnons/ }).click();
  await expect(page.getByRole('button', { name: /Fil coupant niv 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Toile niv 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cocon/ })).toHaveCount(0); // palier 4 verrouillé
  await page.screenshot({ path: `${SHOTS}/26-combat-compagnon-vermine.png` });
});
