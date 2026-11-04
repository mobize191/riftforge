import { describe, it, expect } from 'vitest';
// B28 — Équipement : emplacements (arme/bouclier/armure/accessoire) avec limites en data,
// pas de doublon même rangé à la Maison, grisé côté UI (test core ici).
import { initialState, reduce } from '../src/core/run/state';
import { MERCHANT_ITEMS, CRAFTABLE_EQUIPMENT, EQUIPMENT_SLOT_LIMITS } from '../src/data/equipment';
import { ownedCount, slotFull } from '../src/core/forge/forge';

describe('B28 slots d’équipement', () => {
  it('chaque équipement a un emplacement et les limites sont en data', () => {
    for (const e of [...MERCHANT_ITEMS, ...CRAFTABLE_EQUIPMENT]) {
      expect(['arme', 'bouclier', 'armure', 'accessoire']).toContain(e.slot);
    }
    expect(EQUIPMENT_SLOT_LIMITS.arme).toBe(1);
    expect(EQUIPMENT_SLOT_LIMITS.armure).toBe(1);
  });

  it('limite par emplacement : 1 arme, pas 3 épées', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, credits: 500 } };
    s = reduce(s, { type: 'BUY_ITEM', defId: 'lame-rustique' }); // arme 1/1
    expect(ownedCount(s, 'arme')).toBe(1);
    expect(slotFull(s, 'arme')).toBe(true);
    const before = s;
    s = reduce(s, { type: 'BUY_ITEM', defId: 'dague-venin' }); // 2e arme -> refusé
    expect(s).toBe(before);
    // une armure reste possible
    s = reduce(s, { type: 'BUY_ITEM', defId: 'cuirasse-fer' });
    expect(ownedCount(s, 'armure')).toBe(1);
  });

  it('pas de doublon même si l’objet est rangé à la Maison', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, credits: 500 } };
    s = reduce(s, { type: 'BUY_ITEM', defId: 'bottes-faille' });
    const inst = s.forge.equipment[0];
    s = reduce(s, { type: 'UNEQUIP_ITEM', instanceId: inst.id }); // rangé
    expect(s.forge.homeEquipment.length).toBe(1);
    const before = s;
    s = reduce(s, { type: 'BUY_ITEM', defId: 'bottes-faille' }); // déjà possédé -> refusé
    expect(s).toBe(before);
    // l'emplacement accessoire compte aussi les objets rangés
    expect(ownedCount(s, 'accessoire')).toBe(1);
  });
});
