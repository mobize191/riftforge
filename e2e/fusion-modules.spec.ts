import { test, expect, type Page } from '@playwright/test';

// R11-01 — fusion module + module (décision E1) dans l'IHM réelle (390 px) :
// 1. hors combat : créer 2 modules tier 1 depuis les orbes, les fusionner
//    (panneau ⚗) -> le résultat apparaît, les sources sont consommées ;
// 2. en combat : fusion de 2 modules depuis le menu Modules — coûte le tour.
// Preuves : captures d'écran commitées dans docs/SCREENSHOTS-R11/.

const SHOTS = 'docs/SCREENSHOTS-R11';
test.setTimeout(240000);

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
  await page.waitForTimeout(110);
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

/** Descente (seed 1 : orbes de départ eau, air, terre) + création de Jet sous pression
 *  et Écran de gravats depuis le panneau Modules. */
async function descenteAvecDeuxModulesTier1(page: Page): Promise<void> {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();

  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /Modules \(\d+ cr/ }).click();
  await page.getByRole('button', { name: /✚ Jet sous pression \(palier 1\)/ }).click();
  // Le bouton de craft disparaît (module créé) et le compteur passe à 1.
  await expect(page.getByRole('button', { name: /✚ Jet sous pression \(palier 1\)/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Modules \(1 cré/ })).toBeVisible();
  await page.getByRole('button', { name: /✚ Écran de gravats \(palier 1\)/ }).click();
  await expect(page.getByRole('button', { name: /✚ Écran de gravats \(palier 1\)/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Modules \(2 cré/ })).toBeVisible();
}

test('fusion hors combat : 2 modules tier 1 -> Boue (sources consommées)', async ({ page }) => {
  await descenteAvecDeuxModulesTier1(page);

  // Ferme le panneau Modules : seuls les chips du panneau ⚗ restent matchables.
  await page.getByRole('button', { name: /Modules \(\d+ cr/ }).click();
  // Panneau fusion : sélection des 2 sources puis fusion -> Boue (palier 2).
  await page.getByRole('button', { name: /⚗ Fusion de modules/ }).click();
  await page.getByRole('button', { name: /^Jet sous pression \(palier 1\)$/ }).click();
  await page.getByRole('button', { name: /^Écran de gravats \(palier 1\)$/ }).click();
  await page.screenshot({ path: `${SHOTS}/11-fusion-selection.png` });
  await page.getByRole('button', { name: /⚗ Fusionner → Boue \(palier 2\)/ }).click();

  // Les sources sont consommées : il ne reste que Boue (palier 2).
  await expect(page.getByRole('button', { name: /^Boue \(palier 2\)$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Jet sous pression \(palier 1\)$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Écran de gravats \(palier 1\)$/ })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/12-fusion-boue.png` });

  // Le codex « réalisables » (panneau Modules) ne propose plus Boue (déjà possédée).
  await page.getByRole('button', { name: /⚗ Fusion de modules/ }).click(); // referme le panneau fusion
  await page.getByRole('button', { name: /Modules \(\d+ cr/ }).click(); // rouvre le panneau Modules
  await expect(page.getByText('Fusions réalisables avec vos modules et orbes actuels :')).toBeVisible();
  await expect(page.getByRole('button', { name: /⚗ Boue \(palier 2\) — fusionne/ })).toHaveCount(0);
});

test('fusion en combat : coûte le tour, résultat dans la liste des modules', async ({ page }) => {
  await descenteAvecDeuxModulesTier1(page);
  await page.getByRole('button', { name: /Modules \(\d+ cr/ }).click(); // referme le panneau
  await page.waitForTimeout(150);

  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Au tour de/).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/13-combat-avant-fusion.png` });

  // Menu Modules : le bloc fusion module+module liste les 2 sources.
  await page.getByRole('button', { name: /Modules \(\d+\)/ }).click();
  await expect(page.getByText('Fusionner 2 modules (coûte le tour) :')).toBeVisible();
  await page.getByRole('button', { name: 'Jet sous pression', exact: true }).click();
  await page.getByRole('button', { name: 'Écran de gravats', exact: true }).click();
  await page.getByRole('button', { name: /⚗ Fusionner → Boue \(palier 2\)/ }).click();

  // La fusion a coûté le tour : log explicite, sources consommées, Boue présente.
  await expect(page.getByText(/obtenu par fusion de modules/).first()).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Modules \(\d+\)/ }).click();
  await expect(page.getByRole('button', { name: /▶ Boue/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jet sous pression', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/14-combat-apres-fusion.png` });
});
