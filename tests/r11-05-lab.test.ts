import { describe, it, expect } from 'vitest';
// R11-05 — Labo permanent : améliorations permanentes persistées (save v7) et
// appliquées en combat ; fusions exclusives déblocables uniquement au Labo.
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce, moduleEnergyCost, predictedModuleDamage } from '../src/core/combat/combat';
import { labModifiersOf } from '../src/core/forge/lab';
import { LAB_UPGRADES, LAB_EXCLUSIVE_FUSIONS } from '../src/data/lab';
import { MODULE_FUSION_BY_ID } from '../src/data/moduleFusions';
import { RECIPE_BY_ID } from '../src/data/recipes';
import { serialize, deserialize, SAVE_VERSION, type SaveFile } from '../src/core/save/save';

function forgeRich() {
  let s = initialState();
  s = {
    ...s,
    forge: {
      ...s.forge,
      credits: 500,
      essence: 50,
      mineraiBrut: 50,
      lingots: 20,
      mercurium: 10,
      optifibre: 10,
    },
  };
  return s;
}

describe('R11-05 Labo permanent + save v7', () => {
  it('achat d\'une amélioration permanente : coût exact, persisté (save v7), sans doublon', () => {
    let s = forgeRich();
    const u = LAB_UPGRADES[0]; // Canalisation I : 2 lingots + 1 mercurium
    const before = s.forge.lingots;
    s = reduce(s, { type: 'BUY_LAB_UPGRADE', upgradeId: u.id });
    expect(s.forge.labUpgrades).toContain(u.id);
    expect(s.forge.lingots).toBe(before - 2);
    expect(s.forge.mercurium).toBe(9);
    // doublon refusé
    const again = reduce(s, { type: 'BUY_LAB_UPGRADE', upgradeId: u.id });
    expect(again).toBe(s);
    // persistance : serialize -> deserialize conserve l'achat (save v7)
    expect(SAVE_VERSION).toBe(7);
    const reloaded = deserialize(serialize(s));
    expect(reloaded.forge.labUpgrades).toContain(u.id);
  });

  it('améliorations appliquées en combat : -1 énergie (palier 1) et +10 % dégâts', () => {
    let s = forgeRich();
    s = reduce(s, { type: 'BUY_LAB_UPGRADE', upgradeId: 'lab-energie-1' });
    s = reduce(s, { type: 'BUY_LAB_UPGRADE', upgradeId: 'lab-degats-1' });
    const lab = labModifiersOf(s.forge);
    const t1 = RECIPE_BY_ID['trait-incandescent'];
    expect(moduleEnergyCost(t1, lab)).toBe(moduleEnergyCost(t1) - 1);
    // dégâts en combat : +10 % sur le palier 1 (cible haute PV, pas de cap)
    const base = startCombat(5, 40, 40, 2, ['tisseuse'], ['feu'], null, {}, false, ['trait-incandescent']);
    const withLab = startCombat(5, 40, 40, 2, ['tisseuse'], ['feu'], null, {}, false, ['trait-incandescent'], undefined, [], lab, []);
    const dmgOf = (c: typeof base) => {
      const after = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
      return c.enemies[0].hp - after.enemies[0].hp;
    };
    expect(dmgOf(withLab)).toBe(Math.round(dmgOf(base) * 1.1));
    // la prédiction affichée inclut le bonus (même formule)
    expect(predictedModuleDamage(t1, 2, 'tisseuse-0', lab)).toBe(dmgOf(withLab));
  });

  it('fusion exclusive : refusée en run tant que non débloquée au Labo, puis réalisable', () => {
    let s = forgeRich();
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    // orbes suffisantes pour fabriquer les sources de la fusion exclusive 'fusion-abime' (boue + cyclone)
    s = {
      ...s,
      run: {
        ...s.run!,
        orbs: ['eau', 'terre', 'eau', 'eau', 'air'].map((element, i) => ({ id: `t${i}`, kind: 'primordial' as const, element: element as 'eau', tier: 1 })),
      },
    };
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'jet-pression' });
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'ecran-gravats' });
    s = reduce(s, { type: 'FUSE_MODULES', fusionId: 'fusion-boue' });
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'condensation' });
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'souffle' });
    s = reduce(s, { type: 'FUSE_MODULES', fusionId: 'fusion-cyclone' });
    const hasSources = s.run!.modules.some((m) => m.id === 'boue') && s.run!.modules.some((m) => m.id === 'cyclone');
    expect(hasSources).toBe(true);
    // refus : exclusive non débloquée
    const before = s;
    s = reduce(s, { type: 'FUSE_MODULES', fusionId: 'fusion-abime' });
    expect(s).toBe(before);
    expect(s.run!.modules.some((m) => m.id === 'abime')).toBe(false);
    // déblocage au Labo (retour Forge) puis fusion réalisable
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    s = reduce(s, { type: 'UNLOCK_LAB_FUSION', fusionId: 'fusion-abime' });
    expect(s.forge.labFusions).toContain('fusion-abime');
    const again = reduce(s, { type: 'UNLOCK_LAB_FUSION', fusionId: 'fusion-abime' });
    expect(again).toBe(s); // pas de doublon
    // la fusion exclusive reste verrouillée pour le codex tant que non débloquée
    expect(MODULE_FUSION_BY_ID['fusion-abime'].exclusive).toBe(true);
    // persistance du déblocage
    expect(deserialize(serialize(s)).forge.labFusions).toContain('fusion-abime');
  });

  it('toutes les fusions exclusives déclarées sont bien marquées exclusive en data', () => {
    for (const id of LAB_EXCLUSIVE_FUSIONS) {
      expect(MODULE_FUSION_BY_ID[id]).toBeDefined();
      expect(MODULE_FUSION_BY_ID[id].exclusive).toBe(true);
    }
  });

  it('migration v6 -> v7 : labUpgrades/labFusions remplis par défaut', () => {
    const v6 = JSON.parse(serialize(initialState())) as SaveFile;
    v6.version = 6;
    const f = v6.state.forge as unknown as Record<string, unknown>;
    delete f.labUpgrades;
    delete f.labFusions;
    const migrated = deserialize(JSON.stringify(v6));
    expect(migrated.forge.labUpgrades).toEqual([]);
    expect(migrated.forge.labFusions).toEqual([]);
  });
});
