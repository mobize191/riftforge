import { test, expect, type Page } from '@playwright/test';

// R11-02 (E2) — IHM réelle (390 px) :
// 1. écurie : arbre de 5 compétences par compagnon avec verrous par palier de lien,
//    compagnon de combat vs worker, Mousse (spore) ET un compagnon d'une autre famille ;
// 2. combat : le menu Compagnons ne liste que les compétences débloquées (noms/effets FR) ;
// 3. fin du null silencieux : compagnon d'équipe sans def = refus explicite au départ.
// Preuves : captures dans docs/SCREENSHOTS-R11/.

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
  await page.waitForTimeout(60);
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

/** Patch la save en conservant la run en cours, recharge, et reprend la run (Continuer). */
async function patchSaveRun(
  page: Page,
  patch: { roster: string[]; team: string[]; bondTier?: Record<string, number>; skills?: Record<string, number> },
): Promise<void> {
  await page.evaluate((p) => {
    const ls = window.localStorage;
    const raw = ls.getItem('riftforge-save');
    if (!raw) throw new Error('save absente');
    const file = JSON.parse(raw);
    file.state.forge.roster = p.roster;
    file.state.forge.team = p.team;
    if (p.bondTier) file.state.forge.bondTier = p.bondTier;
    file.state.forge.notice = null;
    // la run en cours a été lancée avant le patch : on reflète les compétences débloquées (palier 3)
    if (p.skills && file.state.run) file.state.run.companionSkills = p.skills;
    const origSet = Storage.prototype.setItem;
    origSet.call(ls, 'riftforge-save', JSON.stringify(file));
    Storage.prototype.setItem = function () {};
  }, patch);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
}

/** Sort du combat en cours (fuite répétée, 60 %/tentative) puis retourne à la carte. */
async function fuirCombat(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const fin = page.getByRole('heading', { name: /VICTOIRE|FUITE|RUN TERMINÉ/ });
    if (await fin.isVisible().catch(() => false)) {
      const btn = page.getByRole('button', { name: 'Continuer' });
      if (await btn.isVisible().catch(() => false)) await btn.click();
      return;
    }
    if (!(await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false))) return; // déjà hors combat
    await page.getByRole('button', { name: /Fuir/ }).first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

test('compagnon gremlin (autre famille) en combat + écurie : arbres à verrous par palier', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  // Run en cours avec Mousse (spore) au roster + Fouineur de données (gremlin, palier 3) en équipe.
  await patchSaveRun(page, {
    roster: ['mousse', 'fouineur'],
    team: ['fouineur'],
    bondTier: { mousse: 1, fouineur: 3 },
    skills: { sondage: 1, extraction: 1, 'corruption-legere': 1 }, // palier 3 -> compétences 1-3
  });

  // Combat : le menu Compagnons ne liste que les compétences débloquées (noms/effets FR).
  await marcherJusquAuCombat(page);
  await expect(page.getByRole('heading', { name: /COMBAT/ })).toBeVisible();
  await expect(page.getByText(/Compagnon : Fouineur de données/)).toBeVisible();
  await page.getByRole('button', { name: /^Compagnons/ }).click();
  await expect(page.getByRole('button', { name: /Sondage niv 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Extraction niv 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Corruption légère niv 1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Root kit/ })).toHaveCount(0); // palier 5 verrouillé
  await page.screenshot({ path: `${SHOTS}/16-combat-compagnon-gremlin.png` });

  // Retour à la Forge (abandon propre, ou écran RETOUR si la fuite a mal tourné).
  await fuirCombat(page);
  if (await page.getByRole('button', { name: 'Entrer à la Forge' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Entrer à la Forge' }).click();
  } else {
    await page.getByRole('button', { name: 'Quitter la Faille' }).click();
  }
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Écurie \(2\)/ })).toBeVisible();
  await expect(page.getByLabel('Nom du compagnon mousse')).toHaveValue('mousse');
  await expect(page.getByLabel('Nom du compagnon fouineur')).toHaveValue('fouineur');
  await expect(page.getByText('⚔ compagnon de combat')).toBeVisible();
  // palier 3 atteint -> compétences 1-3 débloquées, 4-5 verrouillées avec le palier requis
  await expect(page.getByText(/Palier 4 · Vidage mémoire.*🔒 palier 4 requis/)).toBeVisible();
  await expect(page.getByText(/Palier 5 · Root kit.*🔒 palier 5 requis/)).toBeVisible();
  await expect(page.getByText(/Palier 1 · Sondage/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/15-ecurie-arbres.png`, fullPage: true });
});

test('refus explicite : compagnon d\'équipe sans def -> départ en run refusé avec message FR', async ({ page }) => {
  await page.goto('/riftforge/');
  await expect(page.getByRole('heading', { name: 'RIFTFORGE' })).toBeVisible();
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

  await patchSaveRun(page, { roster: ['monstre-inconnu'], team: ['monstre-inconnu'] });
  await page.getByRole('button', { name: 'Quitter la Faille' }).click();
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();

  // Écurie : le compagnon sans def est marqué explicitement (jamais de null silencieux).
  await expect(page.getByRole('alert').filter({ hasText: /Définition de compagnon manquante/ })).toBeVisible();
  // Tentative de départ : refus explicite, on reste à la Forge.
  await page.getByRole('button', { name: 'Redescendre' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Refus de départ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LA FORGE', exact: true })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/17-refus-depart-sans-def.png`, fullPage: true });
});
