import { describe, it, expect } from 'vitest';
// R9-03 — Juice [playtest] : flashs d'impact par élément, tremblement sur gros dégâts,
// transitions d'écran. Preuves auto : présence des classes/effets dans le code UI + build.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('R9-03 juice (présence des effets, lisibilité conservée)', () => {
  it('CombatScreen contient flash par élément, shake sur gros dégâts, fondu de transition', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'ui', 'screens', 'CombatScreen.tsx'), 'utf8');
    expect(src).toContain('rf-flash'); // flash d'impact
    expect(src).toContain('rf-shake'); // tremblement
    expect(src).toContain('rf-fadein'); // transition d'écran
    expect(src).toContain('ELEMENTS[m.inputs[0]].color'); // couleur par élément
    expect(src).toContain('drop >= 4'); // seuil "gros dégâts"
    expect(src).toContain('pointer-events: none'); // le flash ne masque jamais la lisibilité
  });
});
