import { describe, it, expect } from 'vitest';
// R11-01 — fusion module + module (décision E1) : les paliers supérieurs se
// construisent en fusionnant des modules ENTRE EUX, jamais depuis les orbes.
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { createModule, craftableRecipes } from '../src/core/combat/createModule';
import { fuseModules, achievableFusions } from '../src/core/combat/fuseModules';
import { MODULE_FUSIONS, MODULE_FUSION_BY_ID, MODULE_FUSION_BY_RESULT } from '../src/data/moduleFusions';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import type { Orb } from '../src/core/types';

const orb = (element: Orb['element'], id: string): Orb => ({ id, kind: 'primordial', element, tier: 1 });

// Kit tier 1 complet : trait (feu), jet (eau), ecran (terre), souffle (air), condensation (eau x2)
const orbsKit = (): Orb[] => [
  orb('feu', 'f1'),
  orb('eau', 'e1'),
  orb('eau', 'e2'),
  orb('terre', 't1'),
  orb('air', 'a1'),
  orb('eau', 'e3'),
];

describe('R11-01 table des fusions (data)', () => {
  it('13 fusions : tier 2 = 2 modules tier 1 distincts, tier 3 = tier 2 + tier 1 (+ orbes)', () => {
    expect(MODULE_FUSIONS).toHaveLength(13);
    for (const f of MODULE_FUSIONS) {
      expect(RECIPE_BY_ID[f.resultId]).toBeDefined();
      expect([2, 3]).toContain(f.tier);
      expect(RECIPE_BY_ID[f.resultId].tier).toBe(f.tier);
      // sources distinctes (B24 : modules dédupliqués par id)
      expect(new Set(f.inputs).size).toBe(f.inputs.length);
      if (f.tier === 2) {
        expect(f.inputs).toHaveLength(2);
        for (const src of f.inputs) expect(RECIPE_BY_ID[src].tier).toBe(1);
      } else {
        expect(f.inputs).toHaveLength(2);
        const tiers = f.inputs.map((src) => RECIPE_BY_ID[src].tier).sort();
        expect(tiers).toEqual([1, 2]);
      }
      // chaque recette tier >= 2 a exactement une fusion qui la produit
      expect(MODULE_FUSIONS.filter((g) => g.resultId === f.resultId)).toHaveLength(1);
    }
    // les 9 recettes tier >= 2 sont toutes couvertes
    const fusionResults = MODULE_FUSIONS.map((f) => f.resultId);
    for (const r of RECIPES.filter((r) => r.tier >= 2)) expect(fusionResults).toContain(r.id);
  });

  it('balayage complet de la table : chaque fusion tier 2/3 est réalisable depuis le kit tier 1', () => {
    // orbes en quantité pour dérouler toute la table (besoin total : 4 feu,
    // 13 eau, 8 terre, 4 air — chaque fusion appliquée une fois)
    const orbs = (): Orb[] => [
      orb('feu', 'f1'), orb('feu', 'f2'), orb('feu', 'f3'), orb('feu', 'f4'), orb('feu', 'f5'), orb('feu', 'f6'),
      ...Array.from({ length: 22 }, (_, i) => orb('eau', `e${i}`)),
      ...Array.from({ length: 14 }, (_, i) => orb('terre', `t${i}`)),
      ...Array.from({ length: 8 }, (_, i) => orb('air', `a${i}`)),
    ];
    let modules: string[] = [];
    let cur = orbs();
    const fused = new Set<string>(); // résultats de fusion : uniques (B24), jamais recréés
    // fixpoint borné : création tier 1 (recréable — une fusion la consomme) puis
    // toutes fusions réalisables
    for (let guard = 0; guard < 40; guard++) {
      const before = fused.size;
      for (const r of RECIPES.filter((r) => r.tier === 1)) {
        if (modules.includes(r.id)) continue;
        const res = createModule(cur, r.id);
        if (res.ok) {
          cur = res.orbs;
          modules.push(r.id);
        }
      }
      // une fusion à la fois, liste recalculée (chaque fusion consomme ses sources)
      for (;;) {
        const f = achievableFusions(modules, cur).find((g) => !fused.has(g.resultId));
        if (!f) break;
        const res = fuseModules(modules, cur, f.id);
        expect(res.ok).toBe(true);
        modules = [...res.modules!, res.module.id];
        cur = res.orbs!;
        fused.add(res.module.id);
      }
      if (fused.size === before) break;
    }
    for (const f of MODULE_FUSIONS) expect(fused).toContain(f.resultId);
  });
});

describe('R11-01 fuseModules (core pur, sans RNG)', () => {
  it('fusion-combustion : consomme les sources (trait + condensation), produit combustion', () => {
    const res = fuseModules(['trait-incandescent', 'condensation'], orbsKit(), 'fusion-combustion');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.module.id).toBe('combustion');
      expect(res.module.tier).toBe(2);
      // sources consommées : trait et condensation partis, orbes intactes (tier 2 sans orbes)
      expect(res.modules).toEqual([]);
      expect(res.orbs.map((o) => o.id)).toEqual(orbsKit().map((o) => o.id));
    }
  });

  it('fusion-seve-synthetique : consomme boue + jet + 1 orbe eau', () => {
    const res = fuseModules(['boue', 'jet-pression'], orbsKit(), 'fusion-seve-synthetique');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.module.id).toBe('seve-synthetique');
      expect(res.module.tier).toBe(3);
      expect(res.modules).toEqual([]);
      const rest = res.orbs.map((o) => o.id);
      expect(rest).toHaveLength(orbsKit().length - 1); // 1 eau consommée
      expect(rest).not.toContain('e1'); // première eau consommée
    }
  });

  it('refus propre : fusion inconnue, sources absentes, orbes absentes, résultat déjà possédé', () => {
    expect(fuseModules(['trait-incandescent', 'condensation'], orbsKit(), 'inexistant').ok).toBe(false);
    expect(fuseModules(['trait-incandescent'], orbsKit(), 'fusion-combustion')).toMatchObject({ ok: false, reason: 'missing-modules' });
    // seve-synthetique exige 1 orbe eau : sans aucune eau, orbes manquantes
    expect(fuseModules(['boue', 'jet-pression'], [orb('feu', 'f1')], 'fusion-seve-synthetique')).toMatchObject({ ok: false, reason: 'missing-orbs' });
    // résultat déjà possédé -> refus explicite (doublon, B24)
    expect(fuseModules(['combustion', 'trait-incandescent', 'condensation'], orbsKit(), 'fusion-combustion')).toMatchObject({ ok: false, reason: 'duplicate' });
  });

  it('déterministe : mêmes entrées -> même sortie, aucun RNG', () => {
    const a = fuseModules(['trait-incandescent', 'condensation'], orbsKit(), 'fusion-combustion');
    const b = fuseModules(['trait-incandescent', 'condensation'], orbsKit(), 'fusion-combustion');
    expect(a).toEqual(b);
  });
});

describe('R11-01 intégration run (reduce FUSE_MODULES)', () => {
  it('hors combat : fusion libre, ajoute le module + discoveredRecipes, consomme les sources', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: {
        ...s.run!,
        modules: [
          { id: 'trait-incandescent', name: 'Trait incandescent', tier: 1, effect: { kind: 'damage', power: 5 } },
          { id: 'condensation', name: 'Condensation', tier: 1, effect: { kind: 'heal', power: 6 } },
        ],
      },
    };
    s = reduce(s, { type: 'FUSE_MODULES', fusionId: 'fusion-combustion' });
    expect(s.run!.modules.map((m) => m.id)).toEqual(['combustion']);
    expect(s.run!.discoveredRecipes).toContain('combustion');
    expect(s.run!.orbs).toEqual(s.run!.orbs); // orbes tier 2 inchangées
  });

  it('hors combat : sources absentes -> état inchangé (référence conservée)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = { ...s, run: { ...s.run!, modules: [{ id: 'trait-incandescent', name: 'Trait', tier: 1, effect: { kind: 'damage', power: 5 } }] } };
    const before = s;
    s = reduce(s, { type: 'FUSE_MODULES', fusionId: 'fusion-combustion' });
    expect(s).toBe(before);
  });

  it('craftableRecipes n\'expose plus les recettes tier >= 2 (fusion-only)', () => {
    const orbs = orbsKit();
    const list = craftableRecipes(orbs, RECIPES.map((r) => r.id)).map((r) => r.id);
    expect(list).not.toContain('combustion');
    expect(list).not.toContain('seve-synthetique');
    expect(list).toContain('trait-incandescent');
    expect(list).toContain('condensation');
    // createModule refuse explicitement
    expect(createModule(orbs, 'combustion')).toMatchObject({ ok: false, reason: 'fusion-only' });
    expect(createModule(orbs, 'seve-synthetique')).toMatchObject({ ok: false, reason: 'fusion-only' });
  });
});

describe('R11-01 fusion en combat', () => {
  it('coûte le tour (l\'ennemi riposte), aucune énergie, module ajouté', () => {
    const c0 = startCombat(
      1, 20, 20, 4, ['mousse'], ['feu', 'feu'], null, {}, false,
      ['trait-incandescent', 'condensation'],
    );
    expect(c0.phase).toBe('player');
    const c1 = combatReduce(c0, { type: 'FUSE_MODULES', fusionId: 'fusion-combustion' });
    expect(c1.modules).toContain('combustion');
    expect(c1.modules).not.toContain('trait-incandescent'); // source consommée
    expect(c1.log.some((l) => l.includes('fusion de modules'))).toBe(true);
    // le tour est passé : l'ennemi a riposté (PV du joueur baissés) ou le combat a progressé
    expect(c1.phase).toBe('player'); // retour au tour joueur après riposte
    expect(c1.player.hp).toBeLessThanOrEqual(c0.player.hp);
  });

  it('refus en combat : ingrédients absents -> message, tour non consommé', () => {
    const c0 = startCombat(1, 20, 20, 4, ['mousse'], [], null, {}, false, ['trait-incandescent']);
    const c1 = combatReduce(c0, { type: 'FUSE_MODULES', fusionId: 'fusion-combustion' });
    expect(c1.modules).not.toContain('combustion');
    expect(c1.log.some((l) => l.includes('Fusion de modules impossible'))).toBe(true);
    expect(c1.player.hp).toBe(c0.player.hp); // tour non consommé
  });

  it('doublon en combat : résultat déjà possédé -> refus sans effet', () => {
    const c0 = startCombat(
      1, 20, 20, 4, ['mousse'], ['feu', 'feu'], null, {}, false,
      ['combustion', 'trait-incandescent', 'condensation'],
    );
    const c1 = combatReduce(c0, { type: 'FUSE_MODULES', fusionId: 'fusion-combustion' });
    expect(c1.modules.filter((m) => m === 'combustion')).toHaveLength(1);
    expect(c1.player.hp).toBe(c0.player.hp);
  });
});

describe('R11-01 tables auxiliaires cohérentes', () => {
  it('MODULE_FUSION_BY_ID et MODULE_FUSION_BY_RESULT couvrent la table', () => {
    expect(Object.keys(MODULE_FUSION_BY_ID)).toHaveLength(MODULE_FUSIONS.length);
    expect(Object.keys(MODULE_FUSION_BY_RESULT)).toHaveLength(MODULE_FUSIONS.length);
    for (const f of MODULE_FUSIONS) {
      expect(MODULE_FUSION_BY_ID[f.id]).toBe(f);
      expect(MODULE_FUSION_BY_RESULT[f.resultId]).toBe(f);
    }
  });
});
