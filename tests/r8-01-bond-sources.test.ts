import { describe, it, expect } from 'vitest';
// R8-01 — Sources de lien : combats partagés, cadeaux, moments à la Forge ;
// accumulation en XP pur seedé, persistant.
import { initialState, reduce } from '../src/core/run/state';
import { bondTierOf, addBondXp } from '../src/core/forge/bond';
import { BOND_XP } from '../src/data/bond';
import { serialize, deserialize } from '../src/core/save/save';

function forgeWithCompanion() {
  let s = initialState();
  s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'], essence: 10 } };
  return s;
}

describe('R8-01 sources de lien', () => {
  it('victoire partagée (compagnon vivant en équipe) -> XP de lien persistée au retour', () => {
    let s = forgeWithCompanion();
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 5, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] }, companionKo: false });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.bondXp['mousse']).toBe(BOND_XP.perSharedVictory);
    expect(s.forge.bondTier['mousse']).toBe(bondTierOf(BOND_XP.perSharedVictory));
  });

  it('cadeau : coût en data + gain exact d’XP, persistant', () => {
    let s = forgeWithCompanion();
    const essenceBefore = s.forge.essence;
    s = reduce(s, { type: 'GIFT_COMPANION', monsterId: 'mousse' });
    expect(s.forge.essence).toBe(essenceBefore - (BOND_XP.giftCost.essence ?? 0));
    expect(s.forge.bondXp['mousse']).toBe(BOND_XP.perGift);
    // cadeau à un compagnon non possédé -> refus
    const b = s;
    s = reduce(s, { type: 'GIFT_COMPANION', monsterId: 'cuirasse' });
    expect(s).toBe(b);
  });

  it('moment à la Forge (repos avec compagnon en équipe) -> XP de lien', () => {
    let s = forgeWithCompanion();
    s = reduce(s, { type: 'REST_AT_HOME' });
    expect(s.forge.bondXp['mousse']).toBe(BOND_XP.perForgeMoment);
  });

  it('addBondXp pur : chaque source ajoute son gain exact, palier au bon seuil', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'] } };
    s = addBondXp(s, 'mousse', 10);
    expect(s.forge.bondXp['mousse']).toBe(10);
    expect(s.forge.bondTier['mousse']).toBe(2); // seuil palier 2 = 10
    s = addBondXp(s, 'mousse', 15);
    expect(s.forge.bondXp['mousse']).toBe(25);
    expect(s.forge.bondTier['mousse']).toBe(3); // seuil palier 3 = 25
    // persistance save
    expect(deserialize(serialize(s)).forge.bondXp['mousse']).toBe(25);
  });
});
