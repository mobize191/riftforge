// Preuve R10-08/Q10-1 : les portraits PNG réels sont servis (0 404) et visibles en combat.
import { chromium } from '@playwright/test';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
const notFound = [];
page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()); });
await page.goto('http://127.0.0.1:4173/riftforge/');
await page.getByRole('button', { name: 'Nouvelle descente' }).click();
await page.waitForSelector('canvas', { timeout: 30000 });

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
  await page.waitForTimeout(110);
  const apres = await lirePos();
  return apres === avant ? null : apres;
};
let horiz = 'Droite';
for (let i = 0; i < 400; i++) {
  if (await page.getByRole('heading', { name: /COMBAT/ }).isVisible().catch(() => false)) break;
  if ((await bouger(horiz)) === null) {
    if ((await bouger('Bas')) === null) await bouger('Haut');
    horiz = horiz === 'Droite' ? 'Gauche' : 'Droite';
  }
}
await page.waitForTimeout(800); // laisser les portraits charger
// compter les <img> dont la source est un PNG portrait chargé avec succès
const imgs = await page.locator('img').evaluateAll((els) =>
  els.map((e) => ({ src: e.currentSrc ?? e.getAttribute('src'), ok: e.naturalWidth > 0 }))
);
const pngOk = imgs.filter((i) => i.src.includes('assets/portraits') && i.ok).length;
const pngTotal = imgs.filter((i) => i.src.includes('assets/portraits')).length;
console.log(`portraits PNG chargés: ${pngOk}/${pngTotal}`);
console.log('404:', notFound.length ? notFound : 'AUCUN');
await page.screenshot({ path: 'docs/SCREENSHOTS-R10/17-combat-portraits-ia.png' });
await b.close();
process.exit(notFound.length === 0 && pngOk > 0 ? 0 : 1);
