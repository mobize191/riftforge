import { test, expect } from '@playwright/test';

// B29/B30 — e2e écran Forge : sections Maison, Liaiseuse, Travailleurs, Plan de la Forge,
// Labo explicité, emplacements d'équipement affichés. Boucle : titre -> descente ->
// quitter la Faille -> Forge.
test('écran Forge : toutes les sections sont présentes et lisibles', async ({ page }) => {
  await page.goto('/riftforge/');
  await page.getByRole('button', { name: 'Nouvelle descente' }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Quitter la Faille' }).click();

  // sections principales de la Forge
  await expect(page.getByRole('heading', { name: 'LA FORGE' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Maison du héros/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Liaiseuse/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Travailleurs par bâtiment/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Plan de la Forge/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Labo/ })).toBeVisible();
  // explication du Labo (modules palier 1 gratuits avec l'orbe)
  await expect(page.getByText(/palier 1/i).first()).toBeVisible();
  // slots d'équipement affichés chez le Marchand
  await expect(page.getByText(/\[arme\]/).first()).toBeVisible();
  // grille de placement : cases adressables
  await expect(page.getByLabel('Case 0,0')).toBeVisible();
  // bouton repos Maison
  await expect(page.getByRole('button', { name: 'Se reposer à la Maison' })).toBeVisible();
});
