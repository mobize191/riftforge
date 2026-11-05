import type { MonsterDef, MonsterFamily } from '../core/types';

// Monstres placeholder du biome 1 (Les Failles Vertes, famille spore).
// TODO-BALANCE: stats de dev, à calibrer en simulation.

export const MONSTERS: MonsterDef[] = [
  {
    id: 'mousse',
    name: 'Mousse sporulée',
    family: 'spore',
    hp: 9, // TODO-BALANCE
    attack: 2, // TODO-BALANCE (R10 : kit départ encaisse plusieurs coups au biome 1)
    weaknesses: ['feu'],
    resistances: ['eau'],
  },
  {
    id: 'sporeling',
    name: 'Sporeling',
    family: 'spore',
    hp: 7, // TODO-BALANCE
    attack: 3, // TODO-BALANCE (R10 : idem)
    weaknesses: ['air'],
    resistances: [],
  },
  {
    id: 'cuirasse',
    name: 'Champignon cuirassé',
    family: 'spore',
    hp: 13, // TODO-BALANCE
    attack: 2, // TODO-BALANCE (R10 : kit départ encaisse plusieurs coups au biome 1)
    weaknesses: ['terre'],
    resistances: ['air'],
  },
  {
    id: 'amas',
    name: 'Amas de spores',
    family: 'spore',
    hp: 11, // TODO-BALANCE
    attack: 3, // TODO-BALANCE (R10 : idem)
    weaknesses: ['eau'],
    resistances: ['feu'],
  },
];

// --- R6-01..R6-03 : familles des biomes 2-4 ---
// R10-04 (D3) : courbe continue — PV et dégâts monotones par biome, et
// PV(trash du biome N+1) <= PV(boss du biome N) pour tout N (invariant testé).

// Biome 2 — Les Datacathédrales (famille gremlin, ressource « données »).
// PV entre 14 et 28 (boss biome 1 = 30 PV), dégâts 4-5.
export const GREMLINS: MonsterDef[] = [
  { id: 'fouineur', name: 'Fouineur de données', family: 'gremlin', hp: 16, attack: 5, weaknesses: ['eau'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'sapeur', name: 'Sapeur de circuits', family: 'gremlin', hp: 20, attack: 5, weaknesses: ['terre'], resistances: ['feu'] }, // TODO-BALANCE
  { id: 'arroseur', name: 'Arroseur de bugs', family: 'gremlin', hp: 24, attack: 6, weaknesses: ['feu'], resistances: ['eau'] }, // TODO-BALANCE
  { id: 'horloge-cassee', name: 'Horloge cassée', family: 'gremlin', hp: 28, attack: 6, weaknesses: ['air'], resistances: ['terre'] }, // TODO-BALANCE
];

// Biome 3 — Les Hauts-Fourneaux (famille élémentaire, ressource « mercurium »).
// PV entre 40 et 130 (boss biome 2 = 270 PV), dégâts 6-9.
export const ELEMENTAIRES: MonsterDef[] = [
  { id: 'brasero', name: 'Brasero vivant', family: 'elementaire', hp: 40, attack: 7, weaknesses: ['eau'], resistances: ['feu'] }, // TODO-BALANCE
  { id: 'geyser', name: 'Geyser', family: 'elementaire', hp: 60, attack: 8, weaknesses: ['terre'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'cendre', name: 'Spectre de cendre', family: 'elementaire', hp: 90, attack: 9, weaknesses: ['air'], resistances: ['terre'] }, // TODO-BALANCE
  { id: 'magmaton', name: 'Magmaton', family: 'elementaire', hp: 130, attack: 10, weaknesses: ['eau'], resistances: ['feu'] }, // TODO-BALANCE
];

// Biome 4 — La Fibration (famille vermine des réseaux, ressource « optifibre »).
// PV entre 150 et 260 (boss biome 3 = 337 PV), dégâts 10-12.
export const VERMINE: MonsterDef[] = [
  { id: 'wyrm', name: 'Wyrm de fibre', family: 'vermine', hp: 150, attack: 11, weaknesses: ['feu'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'vampire-reseau', name: 'Vampire du réseau', family: 'vermine', hp: 180, attack: 12, weaknesses: ['air'], resistances: ['eau'] }, // TODO-BALANCE
  { id: 'drone-corrompu', name: 'Drone corrompu', family: 'vermine', hp: 220, attack: 12, weaknesses: ['eau'], resistances: ['terre'] }, // TODO-BALANCE
  { id: 'tisseuse', name: 'Tisseuse de fil', family: 'vermine', hp: 260, attack: 13, weaknesses: ['terre'], resistances: ['feu'] }, // TODO-BALANCE
];

MONSTERS.push(...GREMLINS, ...ELEMENTAIRES, ...VERMINE);

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
);

export const MONSTERS_BY_FAMILY: Record<MonsterFamily, MonsterDef[]> = {
  spore: MONSTERS.filter((m) => m.family === 'spore'),
  gremlin: GREMLINS,
  elementaire: ELEMENTAIRES,
  vermine: VERMINE,
};
