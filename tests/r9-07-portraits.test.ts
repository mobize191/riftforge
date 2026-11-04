import { describe, it, expect } from 'vitest';
// R9-07 — Intégration UI des portraits IA (docs/ASSETS.md) : mapping entité -> fichier,
// fallback code-gen si absent, télégraphie par flash, teintes lien/élite. UI uniquement.
import { PORTRAIT_FILE, PORTRAIT_DIR, entityIdOf, isEliteId, portraitUrl, portraitFallbackUrl, bondTierTint, ELITE_TINT } from '../src/ui/portraits';
import { MONSTERS } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';

describe('R9-07 mapping portraits IA (docs/ASSETS.md)', () => {
  it('tous les monstres et boss ont un fichier attendu', () => {
    for (const m of MONSTERS) expect(PORTRAIT_FILE[m.id]).toBeTruthy();
    for (const b of Object.values(BOSS_BY_ID)) expect(PORTRAIT_FILE[b.id]).toBeTruthy();
    expect(PORTRAIT_FILE['heros']).toBe('heros.png');
    expect(PORTRAIT_FILE['marchand']).toBe('marchand.png');
    expect(PORTRAIT_FILE['constructeur']).toBe('constructeur.png');
    expect(PORTRAIT_FILE['liaiseuse']).toBe('liaiseuse.png'); // à venir -> fallback
  });

  it('entityIdOf : boss, élite et index de combat correctement réduits', () => {
    expect(entityIdOf('mousse-0')).toBe('mousse');
    expect(entityIdOf('boss:racine-mere-0')).toBe('racine-mere');
    expect(entityIdOf('elite-mousse-0')).toBe('mousse');
    expect(isEliteId('elite-mousse-0')).toBe(true);
    expect(isEliteId('mousse-0')).toBe(false);
  });

  it('chemins relatifs + fallback code-gen (jamais d’écran vide)', () => {
    expect(portraitUrl('mousse')).toBe(`${PORTRAIT_DIR}/mousse.png`);
    expect(portraitUrl('inconnu')).toBe('');
    expect(portraitFallbackUrl('mousse')).toBe('/assets/portrait-mousse.svg');
    expect(portraitFallbackUrl('racine-mere', true)).toBe('/assets/portrait-racine-mere-telegraph.svg');
  });

  it('teintes : lien par palier (R8-02) et élite (R7)', () => {
    expect(bondTierTint(1)).toBe('');
    expect(bondTierTint(5)).toContain('drop-shadow');
    expect(ELITE_TINT).toContain('drop-shadow');
  });
});
