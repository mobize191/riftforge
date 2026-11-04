import { describe, it, expect } from 'vitest';
// R6-09 — Assets [playtest] : assets commités en local (fallback code-gen, Kenney CC0
// non téléchargeable depuis l'env de build -> substitution documentée), palettes par
// biome, portraits ennemis idle + télégraphie. Aucune URL externe au runtime.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BIOME_ORDER, BIOME_PALETTES } from '../src/data/biomes';
import { MONSTERS } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';

const ASSETS = join(__dirname, '..', 'public', 'assets');

describe('R6-09 assets (fallback code-gen, substitution documentée)', () => {
  it('tuiles par biome + licence commitées', () => {
    for (const b of BIOME_ORDER) {
      expect(existsSync(join(ASSETS, `tile-${b}-floor.svg`))).toBe(true);
      expect(existsSync(join(ASSETS, `tile-${b}-wall.svg`))).toBe(true);
      expect(BIOME_PALETTES[b]).toBeDefined();
    }
    expect(existsSync(join(ASSETS, 'LICENSE.md'))).toBe(true);
    expect(readFileSync(join(ASSETS, 'LICENSE.md'), 'utf8')).toContain('Kenney');
  });

  it('sprites de tous les monstres + portraits idle/télégraphie (boss inclus)', () => {
    const files = readdirSync(ASSETS);
    for (const m of MONSTERS) {
      expect(files).toContain(`monster-${m.id}.svg`);
      expect(files).toContain(`portrait-${m.id}.svg`);
      expect(files).toContain(`portrait-${m.id}-telegraph.svg`);
    }
    for (const b of Object.values(BOSS_BY_ID)) {
      expect(files).toContain(`portrait-${b.id}.svg`);
      expect(files).toContain(`portrait-${b.id}-telegraph.svg`);
    }
  });

  it('aucune référence réseau externe dans le code UI (100 % client, pas de CDN)', () => {
    const ui = join(__dirname, '..', 'src', 'ui');
    const scan = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? scan(join(dir, e.name)) : [join(dir, e.name)],
      );
    for (const f of scan(ui)) {
      if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
      const content = readFileSync(f, 'utf8');
      expect(content).not.toMatch(/https?:\/\//);
    }
  });
});
