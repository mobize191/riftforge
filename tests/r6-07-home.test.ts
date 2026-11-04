import { describe, it, expect } from 'vitest';
// R6-07 — Maison du héros : rangements d'équipement (plusieurs sets, un porté),
// repos (texte léger), trophées dérivés de l'état réel.
import { initialState, reduce } from '../src/core/run/state';
import { trophiesOf } from '../src/core/forge/home';
import { serialize, deserialize, importSave, SAVE_VERSION } from '../src/core/save/save';

describe('R6-07 Maison du héros', () => {
  it('changement d’équipement persistant (équiper/ranger, plusieurs sets, save comprise)', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, credits: 100 } };
    s = reduce(s, { type: 'BUY_ITEM', defId: 'lame-rustique' });
    s = reduce(s, { type: 'BUY_ITEM', defId: 'cuirasse-fer' });
    expect(s.forge.equipment.length).toBe(2);
    const lame = s.forge.equipment.find((e) => e.defId === 'lame-rustique')!;
    // ranger la lame -> elle rejoint les rangements, n'est plus portée
    s = reduce(s, { type: 'UNEQUIP_ITEM', instanceId: lame.id });
    expect(s.forge.equipment.some((e) => e.id === lame.id)).toBe(false);
    expect(s.forge.homeEquipment.some((e) => e.id === lame.id)).toBe(true);
    // re-équiper depuis les rangements
    s = reduce(s, { type: 'EQUIP_ITEM', instanceId: lame.id });
    expect(s.forge.equipment.some((e) => e.id === lame.id)).toBe(true);
    expect(s.forge.homeEquipment.some((e) => e.id === lame.id)).toBe(false);
    // persistance via la sauvegarde
    const back = deserialize(serialize(s));
    expect(back.forge.equipment.map((e) => e.id)).toEqual(s.forge.equipment.map((e) => e.id));
    expect(back.forge.homeEquipment).toEqual(s.forge.homeEquipment);
    // équiper un objet non rangé -> refus
    const before = s;
    s = reduce(s, { type: 'EQUIP_ITEM', instanceId: 'inconnu' });
    expect(s).toBe(before);
  });

  it('repos à la Maison : texte léger, aucun effet mécanique', () => {
    let s = initialState();
    const before = s.forge.credits;
    s = reduce(s, { type: 'REST_AT_HOME' });
    expect(s.forge.lastHomeEvent).toBeTruthy();
    expect(s.forge.credits).toBe(before);
  });

  it('trophées dérivés de l’état réel (boss vaincus persistés via le journal, codex, contrats)', () => {
    let s = initialState();
    let t = trophiesOf(s);
    expect(t.bosses).toEqual([]);
    expect(t.codexComplete).toBe(false);
    expect(t.runCompleted).toBe(false);
    // simule une run avec victoire de boss du biome 1
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['boss:racine-mere'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 10, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    t = trophiesOf(s);
    expect(t.bosses).toContain('racine-mere');
    expect(SAVE_VERSION).toBe(4); // v4 depuis R7-01
    // migration v2 -> v3 : champs Maison remplis
    const v2 = JSON.parse(serialize(s));
    v2.version = 2;
    delete v2.state.forge.homeEquipment;
    delete v2.state.forge.defeatedBosses;
    const m = importSave(JSON.stringify(v2));
    expect(m.forge.homeEquipment).toEqual([]);
    expect(Array.isArray(m.forge.defeatedBosses)).toBe(true);
  });
});
