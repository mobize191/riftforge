// R10-08 — vérification headed finale : parcours complet sur pnpm dev (port 3000),
// zéro erreur console autorisée. Descente -> combat -> capture -> retour Forge ->
// ré-équipement -> nouvelle descente.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000/riftforge/';
const b = await chromium.launch({ headless: false }); // headed : fenêtre réelle sur le poste local
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console.error: ' + m.text());
});

const lirePos = async () => {
  try {
    const t = await page.getByText(/Position/).first().innerText({ timeout: 1500 });
    const m = t.match(/\((\d+),\s*(\d+)\)/);
    return m ? `${m[1]},${m[2]}` : null;
  } catch { return null; }
};
const bouger = async (dir) => {
  const avant = await lirePos();
  try { await page.getByRole('button', { name: dir }).click({ timeout: 1500 }); } catch { return null; }
  await page.waitForTimeout(120);
  const apres = await lirePos();
  return apres === avant ? null : apres;
};
const marcher = async () => {
  let horiz = 'Droite';
  for (let i = 0; i < 400; i++) {
    if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) return true;
    if ((await bouger(horiz)) === null) {
      if ((await bouger('Bas')) === null) await bouger('Haut');
      horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
    }
  }
  return false;
};

await page.goto(BASE);
await page.getByRole('button', { name: 'Nouvelle descente' }).click();
await page.waitForSelector('canvas', { timeout: 30000 });
console.log('carte OK');

// combat + capture du mousse
let ok = await marcher();
console.log('combat atteint:', ok);
for (let i = 0; i < 12 && ok; i++) {
  if (await page.getByRole('heading', { name: /VICTOIRE/ }).isVisible().catch(() => false)) break;
  if (await page.getByText('RUN TERMINÉE').isVisible().catch(() => false)) { console.log('mort, on reprend'); break; }
  const li = page.locator('li', { hasText: 'Mousse' }).first();
  if (i === 0 && (await li.isVisible().catch(() => false))) await li.getByRole('button').first().click();
  await page.getByRole('button', { name: 'Capturer' }).first().click().catch(() => {});
  await page.waitForTimeout(180);
}
const victoire = await page.getByRole('heading', { name: /VICTOIRE/ }).isVisible().catch(() => false);
console.log('victoire/capture:', victoire);
if (victoire) await page.getByRole('button', { name: 'Continuer' }).click();
await page.getByRole('button', { name: 'Quitter la Faille' }).click();
await page.waitForSelector('text=LA FORGE', { timeout: 15000 });
console.log('Forge OK, écurie:', await page.getByRole('heading', { name: /Écurie/ }).isVisible());

// ré-équipement : mettre en équipe si un compagnon est là
const team = page.getByRole('button', { name: /Mettre en équipe/ }).first();
if (await team.isVisible().catch(() => false)) {
  await team.click();
  console.log('équipe:', await page.getByRole('button', { name: /✓ En équipe/ }).isVisible());
}

// nouvelle descente
await page.getByRole('button', { name: 'Redescendre' }).click();
await page.waitForSelector('canvas', { timeout: 30000 });
console.log('nouvelle descente OK');
await marcher();
console.log('2e combat atteint:', await page.getByRole('heading', { name: /COMBAT/ }).isVisible());

console.log('ERREURS CONSOLE:', errors.length ? errors : 'AUCUNE');
await page.screenshot({ path: 'docs/SCREENSHOTS-R10/16-headed-final.png' });
await b.close();
process.exit(errors.length ? 1 : 0);
