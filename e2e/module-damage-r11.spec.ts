import { test, expect, type Page } from '@playwright/test';

// R11-04 (E4) — dégâts PRÉVUS affichés sur les boutons de modules en combat (390 px),
// et le montant affiché correspond exactement au log après le lancement.
// Preuve : capture docs/SCREENSHOTS-R11/19-combat-degats-predits.png.

const SHOTS = 'docs/SCREENSHOTS-R11';
test.setTimeout(240000);

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
  for (let i = 0; i < 900; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return;
    const horizBouge = await bouger(page, horiz);
    if (horizBouge === null) {
      if ((await bouger(page, 'Bas')) === null) await bouger(page, 'Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
}

test('combat : le bouton module affiche les dégâts prévus et le log confirme le montant', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();

  // Menu Modules : le bouton solo « Jet sous pression (eau) » affiche « — N PV » (R11-04/E4).
  await page.getByRole('button', { name: /Modules \(\d+\)/ }).click();
  const btn = page.getByRole('button', { name: /Jet sous pression \(Eau\).*— (\d+) PV/ });
  await expect(btn).toBeVisible();
  const prevu = (await btn.innerText()).match(/— (\d+) PV/)![1];
  await page.screenshot({ path: `${SHOTS}/19-combat-degats-predits.png` });

  // Lancement : le log affiche exactement le montant prévu.
  await btn.click();
  await expect(page.getByText(new RegExp(`Jet sous pression sur .+: -${prevu} PV`)).first()).toBeVisible({ timeout: 8000 });
});
