import type { MonsterDef } from '../core/types';

// Monstres placeholder du biome 1 (Les Failles Vertes, famille spore).
// TODO-BALANCE: stats de dev, à calibrer en simulation.

export const MONSTERS: MonsterDef[] = [
  {
    id: 'mousse',
    name: 'Mousse sporulée',
    family: 'spore',
    hp: 8, // TODO-BALANCE
    attack: 2, // TODO-BALANCE
    weaknesses: ['feu'],
    resistances: ['eau'],
  },
  {
    id: 'sporeling',
    name: 'Sporeling',
    family: 'spore',
    hp: 6, // TODO-BALANCE
    attack: 3, // TODO-BALANCE
    weaknesses: ['air'],
    resistances: [],
  },
  {
    id: 'cuirasse',
    name: 'Champignon cuirassé',
    family: 'spore',
    hp: 12, // TODO-BALANCE
    attack: 2, // TODO-BALANCE
    weaknesses: ['terre'],
    resistances: ['air'],
  },
  {
    id: 'amas',
    name: 'Amas de spores',
    family: 'spore',
    hp: 10, // TODO-BALANCE
    attack: 4, // TODO-BALANCE
    weaknesses: ['eau'],
    resistances: ['feu'],
  },
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
);
