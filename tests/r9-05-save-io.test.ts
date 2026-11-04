import { describe, it, expect } from 'vitest';
// R9-05 — Export/import de save : round-trip export -> import -> état identique,
// refus propre des versions inconnues (fonctions core utilisées par l'UI titre).
import { initialState, reduce } from '../src/core/run/state';
import { exportSave, importSave, UnknownSaveVersionError } from '../src/core/save/save';

describe('R9-05 export/import de save', () => {
  it('round-trip export -> import -> état identique (avec run en cours, biomes, lien)', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'], bondXp: { mousse: 30 }, bondTier: { mousse: 3 }, riftModifiers: { fibration: ['elites'] }, credits: 42 } };
    s = reduce(s, { type: 'START_RUN', seed: 77, biomeIndex: 2 });
    s = reduce(s, { type: 'NEXT_FLOOR' });
    const json = exportSave(s);
    const back = importSave(json);
    expect(back).toEqual(s);
    expect(back.run!.biomeIndex).toBe(2);
    expect(back.forge.bondTier['mousse']).toBe(3);
  });

  it('version inconnue -> refus propre (UnknownSaveVersionError), JSON invalide -> erreur', () => {
    const s = initialState();
    const v99 = JSON.parse(exportSave(s));
    v99.version = 99;
    expect(() => importSave(JSON.stringify(v99))).toThrow(UnknownSaveVersionError);
    expect(() => importSave('{"version":2}')).toThrow(); // v2 sans état -> invalide, refusé proprement
    expect(() => importSave('pas du json')).toThrow();
  });
});
