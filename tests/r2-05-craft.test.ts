import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { CRAFTABLE_EQUIPMENT } from '../src/data/equipment';

function forgeWith(credits: number, essence: number, mineraiBrut: number, lingots: number) {
  const s = initialState();
  return { ...s, forge: { ...s.forge, credits, essence, mineraiBrut, lingots } };
}

describe('R2-05 craft d’équipement à la Forge Arcane', () => {
  it('le craft débite les ressources et ajoute l’équipement', () => {
    const item = CRAFTABLE_EQUIPMENT[0];
    let s = forgeWith(0, 10, 10, 5);
    s = reduce(s, { type: 'CRAFT_ITEM', defId: item.id });
    expect(s.forge.equipment.map((e) => e.defId)).toContain(item.id);
    expect(s.forge.essence).toBe(10 - item.craftCost.essence!);
    expect(s.forge.lingots).toBe(5 - item.craftCost.lingots!);
  });

  it('craft refusé sans les ressources', () => {
    const s = forgeWith(0, 0, 0, 0);
    const next = reduce(s, { type: 'CRAFT_ITEM', defId: CRAFTABLE_EQUIPMENT[0].id });
    expect(next).toBe(s);
  });

  it('l’équipement crafté survit à deux runs et se porte', () => {
    const item = CRAFTABLE_EQUIPMENT[1]; // +10 PV
    let s = forgeWith(0, 0, 10, 5);
    s = reduce(s, { type: 'CRAFT_ITEM', defId: item.id });
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(s.run!.playerMaxHp).toBe(20 + 10);
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.equipment).toHaveLength(1);
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    expect(s.run!.playerMaxHp).toBe(30);
  });
});
