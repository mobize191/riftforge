import { test, expect, type Page } from '@playwright/test';

// R10-01 — parcours compagnon complet dans l'IHM réelle (390 px) :
// capture d'un monstre en combat -> retour Forge -> Écurie -> mise en équipe
// -> redescente -> le compagnon apparaît au combat.
// Preuves : captures d'écran commitées dans docs/SCREENSHOTS-R10/.

const SHOTS = 'docs/SCREENSHOTS-R10';
test.setTimeout(600000);

const DIRS = ['Droite', 'Bas', 'Gauche', 'Haut'] as const;

/** Position du joueur lue dans le HUD (« Position : (x, y) »), null hors carte. */
async function lirePos(page: Page): Promise<string | null> {
  try {
    const t = await page.getByText(/Position/).first().innerText({ timeout: 1500 });
    const m = t.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    return m ? `${m[1]},${m[2]}` : null;
  } catch {
    return null;
  }
}

/** Un déplacement ; retourne la nouvelle position ou null si mur/combat/pad absent. */
async function bouger(page: Page, dir: string): Promise<string | null> {
  const avant = await lirePos(page);
  try {
    await page.getByRole('button', { name: dir }).click({ timeout: 1500 });
  } catch {
    return null; // pad absent (combat, écran, ...) ou mur : l'appelant rebondit
  }
  await page.waitForTimeout(60);
  const apres = await lirePos(page);
  return apres === avant ? null : apres;
}

/** Déambule sur la carte en « épouvantail » (rangées) jusqu'à déclencher un combat. */
async function marcherJusquAuCombat(page: Page): Promise<void> {
  let horiz = 'Droite';
  for (let i = 0; i < 900; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return;
    const horizBouge = await bouger(page, horiz);
    if (horizBouge === null) {
      // Mur horizontal : on descend d'une rangée (ou on remonte si bloqué) et on inverse.
      if ((await bouger(page, 'Bas')) === null) await bouger(page, 'Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
}

/** Descend et tente la capture. Retourne true si VICTOIRE atteinte. */
async function tenterCapture(page: Page): Promise<boolean> {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-titre.png` });

  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/02-carte.png` });

  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Au tour de/).first()).toBeVisible(); // B27 : bannière de tour
  await page.screenshot({ path: `${SHOTS}/03-combat-debut.png` });

  // Capture : sélection du mousse puis « Capturer » répété (déterministe, seed 1).
  const liMousse = page.locator('li', { hasText: 'Mousse' }).first();
  await liMousse.getByRole('button', { name: /Sélectionner/ }).click();
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole('heading', { name: /VICTOIRE/ }).isVisible().catch(() => false)) {
      return true;
    }
    if (await page.getByText('RUN TERMINÉE').first().isVisible().catch(() => false)) {
      return false; // K.O. joueur : capture perdue
    }
    await page.getByRole('button', { name: 'Capturer' }).first().click().catch(() => {});
    await page.waitForTimeout(120);
  }
  return (await page.getByRole('heading', { name: /VICTOIRE/ }).isVisible().catch(() => false));
}

test('parcours compagnon : capture -> écurie -> équipe -> combat', async ({ page }) => {
  // 1. Descente + capture (jusqu'à 4 descentes : la capture est probabiliste).
  let captureOK = false;
  for (let essai = 0; essai < 4 && !captureOK; essai++) {
    captureOK = await tenterCapture(page);
  }
  expect(captureOK, 'capture réussie en combat (<= 4 descentes)').toBe(true);
  await page.screenshot({ path: `${SHOTS}/04-victoire.png` });

  // 2. Continuer puis quitter la Faille -> Forge.
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('button', { name: 'Quitter la Faille' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/05-carte-apres-capture.png` });
  await page.getByRole('button', { name: 'Quitter la Faille' }).click();

  // 3. Forge : l'écurie affiche le roster.
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Écurie/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-ecureuil.png` });

  // 4. Mise en équipe (ASSIGN_TO_TEAM).
  const equipe = page.getByRole('button', { name: /Mettre en équipe/ }).first();
  await expect(equipe).toBeVisible();
  await equipe.click();
  await expect(page.getByRole('button', { name: /✓ En équipe/ })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/07-equipe.png` });

  // 5. Redescente : le compagnon apparaît au combat.
  await page.getByRole('button', { name: 'Redescendre' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Au tour de/).first()).toBeVisible();
  await expect(page.getByText(/Compagnon :/).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/08-combat-avec-compagnon.png` });
});
