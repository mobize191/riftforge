import { describe, it, expect } from 'vitest';
// B32 — fusion d'orbes HORS combat (gratuite, illimitée, §SPEC-5.2) : le core le fait
// en mode RUN (testé ici) et l'UI carte a désormais le panneau de fusion.
// B33 — soin capé au max : le log affiche le montant EFFECTIF (pas le nominal).
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('B32 fusion hors combat', () => {
  it('FUSE_ORBS en mode RUN (hors combat) : gratuite, illimitée, orbe composite obtenue', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 5 });
    s = {
      ...s,
      run: {
        ...s.run!,
        orbs: [
          { id: 'a', kind: 'primordial', element: 'feu', tier: 1 },
          { id: 'b', kind: 'primordial', element: 'terre', tier: 1 },
          { id: 'c', kind: 'primordial', element: 'air', tier: 1 },
        ],
      },
    };
    const n0 = s.run!.orbs.length;
    s = reduce(s, { type: 'FUSE_ORBS', indices: [0, 1] }); // feu+terre -> composite
    expect(s.run!.orbs.length).toBe(n0 - 1);
    expect(s.run!.orbs.some((o) => o.kind === 'composite')).toBe(true);
    s = reduce(s, { type: 'FUSE_ORBS', indices: [0, 1] }); // encore (air + composite refusé si opposition...)
    // feu/eau s'annulent : refus propre
    let s2 = {
      ...s,
      run: { ...s.run!, orbs: [
        { id: 'x', kind: 'primordial', element: 'feu', tier: 1 },
        { id: 'y', kind: 'primordial', element: 'eau', tier: 1 },
      ] },
    };
    const before = s2;
    s2 = reduce(s2, { type: 'FUSE_ORBS', indices: [0, 1] });
    expect(s2).toBe(before); // opposition -> refusé proprement
    // UI : le panneau de fusion existe dans la vue carte
    const appSrc = readFileSync(join(__dirname, '..', 'src', 'ui', 'App.tsx'), 'utf8');
    expect(appSrc).toContain('FUSE_ORBS');
    expect(appSrc).toContain('Fusionner 2 orbes');
  });
});

describe('B33 soin capé au maximum — log du montant effectif', () => {
  it('sève synthétique : soigne jusqu’au max, log effectif (pas le nominal 12)', () => {
    // boss au 1er tour = télégraphie sans dégâts -> isole le soin
    let c = startCombat(1, 18, 20, 4, ['boss:racine-mere'], ['eau'], null, {}, false, ['seve-synthetique']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'seve-synthetique', target: 0 });
    // 18 + 12 -> capé à 20, puis le boss exécute son attaque télégraphiée (-2) -> 18
    // on vérifie surtout le log : montant effectif, pas "+12"
    const healLine = c.log.find((l) => l.includes('Sève'))!;
    expect(healLine).toContain('+2 PV'); // 20 - 18 = 2 effectif
    expect(c.player.hp).toBeLessThanOrEqual(20);
  });

  it('soin alors que PV déjà au max : aucun changement, log explicite', () => {
    let c = startCombat(1, 20, 20, 4, ['boss:racine-mere'], ['eau'], null, {}, false, ['seve-synthetique']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'seve-synthetique', target: 0 });
    expect(c.log.some((l) => l.includes('au maximum'))).toBe(true);
  });

  it('soin partiel : PV 5/20 + 12 -> 17 (cap respecté), log +12', () => {
    let c = startCombat(1, 5, 20, 4, ['boss:racine-mere'], ['eau'], null, {}, false, ['seve-synthetique']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'seve-synthetique', target: 0 });
    const healLine = c.log.find((l) => l.includes('Sève'))!;
    expect(healLine).toContain('+12 PV');
    // après le boss télégraphié puis exécuté, PV <= 20
    expect(c.player.hp).toBeLessThanOrEqual(20);
  });
});
