import { defineConfig } from '@playwright/test';

// Sert le build statique (out/) en local (loopback uniquement) et joue l'IHM réelle.
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 }, // téléphone
  },
  webServer: {
    // B35 : serveur statique cross-platform (Windows/CI), sert out/ sous /riftforge/.
    command: 'node scripts/serve-e2e.mjs',
    url: 'http://127.0.0.1:4173/riftforge/',
    reuseExistingServer: true,
    timeout: 20000,
  },
  expect: {
    // B35 : boot WebGL headless (software rendering) parfois > 5 s sur un poste lent.
    timeout: 15000,
  },
});
