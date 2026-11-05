import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

// R10-08 — Suite IHM locale exhaustive (exécutée EN LOCAL, pas en CI) :
// 1. export/import de save via vrai fichier (download + setInputFiles)
// 2. persistance localStorage à travers page.reload()
// 3. navigation clavier des menus de combat + focus visible
// 4. touch à 390 px (hasTouch) + hit-zones >= 44 px
// 5. audio : déclencheurs sans exception, mute persisté
// 6. matrice de viewports 390/768/1440/2560 sur titre, carte, Forge, combat

const SHOTS = 'docs/SCREENSHOTS-R10';
test.setTimeout(300000);

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

test('export/import de save via vrai fichier + persistance après reload', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  // déplace le joueur pour avoir un état non trivial
  await bouger(page, 'Droite');
  await bouger(page, 'Bas');
  const pos = await lirePos(page);
  expect(pos).not.toBeNull();

  // reload -> persistance localStorage
  await page.reload();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  expect(await lirePos(page)).toBe(pos);

  // retour titre -> export (download réel)
  await page.reload();
  await expect(page.getByRole('button', { name: 'Télécharger la save' })).toBeVisible();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger la save' }).click();
  const download = await dl;
  const filePath = path.join('test-results', download.suggestedFilename());
  await download.saveAs(filePath);
  expect(fs.existsSync(filePath)).toBe(true);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  expect(json.version).toBeGreaterThan(0);

  // on efface la save locale, puis on réimporte le fichier -> état restauré
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nouvelle descente' })).toBeVisible();
  await page.getByLabel('Fichier de sauvegarde').setInputFiles(filePath);
  await page.reload();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  expect(await lirePos(page)).toBe(pos);
});

test('navigation clavier en combat + focus visible', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // Tab jusqu'au bouton Attaquer, focus visible (outline non none)
  let focused = '';
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return '';
      const cs = getComputedStyle(el);
      return `${el.textContent?.slice(0, 30)}|outline=${cs.outlineStyle}|ring=${cs.boxShadow !== 'none'}`;
    });
    if (/Attaquer/.test(focused)) break;
  }
  expect(focused).toContain('Attaquer');
  expect(focused).not.toContain('outline=none'); // focus visible
  // Entrée déclenche l'attaque (log évolue)
  const logAvant = await page.locator('main').innerText();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const logApres = await page.locator('main').innerText();
  expect(logApres).not.toBe(logAvant);
});

test('touch à 390 px : pavé tactile pilote le joueur, hit-zones >= 44 px', async ({ browser }) => {
  const ctx: BrowserContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // hit-zones du pavé >= 44 px
  for (const name of ['Haut', 'Bas', 'Gauche', 'Droite', 'Interagir']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box, `hit-zone ${name}`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  // tap tactile déplace le joueur
  const avant = await lirePos(page);
  for (const name of ['Droite', 'Bas', 'Gauche', 'Haut']) {
    await page.getByRole('button', { name }).tap();
    await page.waitForTimeout(200);
    const apres = await lirePos(page);
    if (apres !== avant) break;
  }
  expect(await lirePos(page)).not.toBe(avant);
  await ctx.close();
});

test('audio : déclencheurs sans exception, mute persisté', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  // un combat = plusieurs déclencheurs audio (attaque, etc.)
  await page.getByRole('button', { name: /^Attaquer/ }).click();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);

  // mute persisté à travers reload (bouton Son sur l'écran titre)
  await page.reload();
  await page.waitForTimeout(500);
  const etat = await page.getByRole('button', { name: /Son :/ }).innerText();
  await page.getByRole('button', { name: /Son :/ }).click(); // toggle
  const apresToggle = await page.getByRole('button', { name: /Son :/ }).innerText();
  expect(apresToggle).not.toBe(etat);
  await page.reload();
  await page.waitForTimeout(500);
  expect(await page.getByRole('button', { name: /Son :/ }).innerText()).toBe(apresToggle); // persisté
  expect(errors).toEqual([]);
});

test('matrice de viewports 390/768/1440/2560 sur titre, carte, Forge, combat', async ({ browser }) => {
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900], [2560, 1440]] as const) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto('/riftforge/');
    await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/11-matrice-${w}-titre.png` });

    await page.getByRole('button', { name: 'Nouvelle descente' }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: `${SHOTS}/11-matrice-${w}-carte.png` });

    await marcherJusquAuCombat(page);
    await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/11-matrice-${w}-combat.png` });
    // jauge énergie lisible à chaque largeur
    await expect(page.getByText(/Énergie : \d+\/\d+/)).toBeVisible();

    // quitter -> Forge : save vidée, nouvelle descente, puis Quitter la Faille depuis la carte
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/riftforge/');
    await page.getByRole('button', { name: 'Nouvelle descente' }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Quitter la Faille' }).click();
    await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/11-matrice-${w}-forge.png`, fullPage: true });
    await ctx.close();
  }
});
