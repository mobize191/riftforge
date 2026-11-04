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
    command: 'mkdir -p /tmp/rf-site && ln -sfn "$(pwd)/out" /tmp/rf-site/riftforge && python3 -m http.server 4173 --directory /tmp/rf-site --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/riftforge/',
    reuseExistingServer: true,
    timeout: 20000,
  },
});
