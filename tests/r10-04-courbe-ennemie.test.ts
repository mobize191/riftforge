import { describe, it, expect } from 'vitest';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';
import { BIOME_ORDER, BIOME_BY_ID } from '../src/data/biomes';
import { biomeStructureOf } from '../src/core/run/state';
import { BALANCE } from '../src/data/balance';

// R10-04 (décision D3) — courbe ennemie continue, data uniquement.
// Invariants testés sur toute la table :
//  - PV(trash du biome N+1) <= PV(boss du biome N) pour tout N ;
//  - boss = pic net : PV(boss N) > PV max des trashs de son biome ;
//  - dégâts ennemis monotones (non décroissants) par biome ;
//  - le kit de départ encaisse plusieurs coups au biome 1.

const FAMILIES_IN_ORDER = BIOME_ORDER.map((id) => BIOME_BY_ID[id].family);

describe('R10-04 — courbe ennemie continue (D3)', () => {
  it('PV(trash N+1) <= PV(boss N) pour tout biome N', () => {
    for (let n = 0; n < BIOME_ORDER.length - 1; n++) {
      const { def: bossDef } = biomeStructureOf(n);
      const bossHp = BOSS_BY_ID[bossDef.bossId].hp;
      const nextTrash = MONSTERS_BY_FAMILY[FAMILIES_IN_ORDER[n + 1]];
      const maxNext = Math.max(...nextTrash.map((m) => m.hp));
      expect(maxNext, `biome ${n + 1} -> ${n + 2} vs boss ${bossDef.bossId}`).toBeLessThanOrEqual(bossHp);
    }
  });

  it('chaque boss est un pic net sur son biome', () => {
    for (let n = 0; n < BIOME_ORDER.length; n++) {
      const { def } = biomeStructureOf(n);
      const bossHp = BOSS_BY_ID[def.bossId].hp;
      const trash = MONSTERS_BY_FAMILY[FAMILIES_IN_ORDER[n]];
      expect(bossHp).toBeGreaterThan(Math.max(...trash.map((m) => m.hp)));
    }
  });

  it('dégâts ennemis monotones par biome', () => {
    let prev = 0;
    for (const fam of FAMILIES_IN_ORDER) {
      const maxAtk = Math.max(...MONSTERS_BY_FAMILY[fam].map((m) => m.attack));
      expect(maxAtk, `famille ${fam}`).toBeGreaterThanOrEqual(prev);
      prev = maxAtk;
    }
  });

  it('PV des trashs monotones par biome (montée continue)', () => {
    let prevMax = 0;
    for (const fam of FAMILIES_IN_ORDER) {
      const maxHp = Math.max(...MONSTERS_BY_FAMILY[fam].map((m) => m.hp));
      expect(maxHp, `famille ${fam}`).toBeGreaterThan(prevMax);
      prevMax = maxHp;
    }
  });

  it('le kit de départ encaisse plusieurs coups au biome 1', () => {
    const biome1 = MONSTERS_BY_FAMILY[FAMILIES_IN_ORDER[0]];
    const maxAtk = Math.max(...biome1.map((m) => m.attack));
    // 20 PV de départ : un trash du biome 1 met au moins 4 coups à tuer le joueur.
    expect(Math.ceil(BALANCE.START_PLAYER_HP / maxAtk)).toBeGreaterThanOrEqual(4);
    expect(maxAtk).toBeLessThan(BALANCE.START_PLAYER_HP / 2);
  });
});
