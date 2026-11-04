import { describe, it, expect } from 'vitest';
// R8-02 — Paliers 1-5 et marqueurs visuels : franchissement reproductible, bonus
// appliqués en run UNIQUEMENT si le compagnon est en équipe ; marqueur par palier.
import { initialState, reduce } from '../src/core/run/state';
import { addBondXp, bondTierOf, bondHpBonus } from '../src/core/forge/bond';
import { BOND_XP, BOND_TIERS, BOND_TIER_EFFECTS } from '../src/data/bond';

describe('R8-02 paliers de lien 1-5', () => {
  it('franchissement des 5 paliers reproductible aux bons seuils (data)', () => {
    const thresholds = BOND_XP.tierXpThresholds;
    expect(thresholds.length).toBe(5);
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'] } };
    expect(s.forge.bondTier['mousse'] ?? 1).toBe(1); // palier 1 à 0 XP
    for (let tier = 2; tier <= 5; tier++) {
      expect(bondTierOf(thresholds[tier - 1])).toBe(tier);
      s = addBondXp(s, 'mousse', thresholds[tier - 1] - (s.forge.bondXp['mousse'] ?? 0));
      expect(s.forge.bondTier['mousse']).toBe(tier);
    }
    // marqueur visuel par palier, en data
    expect(BOND_TIERS.length).toBe(5);
    for (const t of BOND_TIERS) expect(t.visualMarker).toBeTruthy();
    // effets par palier en data
    expect(BOND_TIER_EFFECTS.length).toBe(5);
  });

  it('bonus de palier appliqués en run UNIQUEMENT si le compagnon est en équipe', () => {
    // palier 3 -> +8 PV ; sans équipe -> aucun bonus
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], bondXp: { mousse: 25 }, bondTier: { mousse: 3 } } };
    expect(bondHpBonus(s)).toBe(0); // pas en équipe
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['mousse'] });
    expect(bondHpBonus(s)).toBe(8);
    const base = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    const withBond = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(withBond.run!.playerMaxHp).toBe(base.run!.playerMaxHp + 8);
    // palier 5 : capacité signature -> compétence initiale +1 niveau
    let s5 = initialState();
    s5 = { ...s5, forge: { ...s5.forge, roster: ['mousse'], team: ['mousse'], bondXp: { mousse: 90 }, bondTier: { mousse: 5 } } };
    const r5 = reduce(s5, { type: 'START_RUN', seed: 7 });
    const skillId = Object.keys(r5.run!.companionSkills)[0];
    expect(r5.run!.companionSkills[skillId]).toBe(2); // 1 (initial) + 1 (signature palier 5)
  });
});
