import type { MonsterDef, MonsterFamily } from '../core/types';

// Monstres placeholder du biome 1 (Les Failles Vertes, famille spore).
// TODO-BALANCE: stats de dev, à calibrer en simulation.

export const MONSTERS: MonsterDef[] = [
  {
    id: 'mousse',
    name: 'Mousse sporulée',
    family: 'spore',
    hp: 9, // TODO-BALANCE
    attack: 3, // TODO-BALANCE
    weaknesses: ['feu'],
    resistances: ['eau'],
  },
  {
    id: 'sporeling',
    name: 'Sporeling',
    family: 'spore',
    hp: 7, // TODO-BALANCE
    attack: 4, // TODO-BALANCE
    weaknesses: ['air'],
    resistances: [],
  },
  {
    id: 'cuirasse',
    name: 'Champignon cuirassé',
    family: 'spore',
    hp: 13, // TODO-BALANCE
    attack: 3, // TODO-BALANCE
    weaknesses: ['terre'],
    resistances: ['air'],
  },
  {
    id: 'amas',
    name: 'Amas de spores',
    family: 'spore',
    hp: 11, // TODO-BALANCE
    attack: 4, // TODO-BALANCE
    weaknesses: ['eau'],
    resistances: ['feu'],
  },
];

// --- R6-01..R6-03 : familles des biomes 2-4 (TODO-BALANCE : stats de dev) ---

// Biome 2 — Les Datacathédrales (famille gremlin, ressource « données »).
export const GREMLINS: MonsterDef[] = [
  { id: 'fouineur', name: 'Fouineur de données', family: 'gremlin', hp: 31, attack: 10, weaknesses: ['eau'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'sapeur', name: 'Sapeur de circuits', family: 'gremlin', hp: 45, attack: 9, weaknesses: ['terre'], resistances: ['feu'] }, // TODO-BALANCE
  { id: 'arroseur', name: 'Arroseur de bugs', family: 'gremlin', hp: 36, attack: 11, weaknesses: ['feu'], resistances: ['eau'] }, // TODO-BALANCE
  { id: 'horloge-cassee', name: 'Horloge cassée', family: 'gremlin', hp: 54, attack: 10, weaknesses: ['air'], resistances: ['terre'] }, // TODO-BALANCE
];

// Biome 3 — Les Hauts-Fourneaux (famille élémentaire, ressource « mercurium »).
export const ELEMENTAIRES: MonsterDef[] = [
  { id: 'brasero', name: 'Brasero vivant', family: 'elementaire', hp: 40, attack: 11, weaknesses: ['eau'], resistances: ['feu'] }, // TODO-BALANCE
  { id: 'geyser', name: 'Geyser', family: 'elementaire', hp: 31, attack: 10, weaknesses: ['terre'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'cendre', name: 'Spectre de cendre', family: 'elementaire', hp: 49, attack: 10, weaknesses: ['air'], resistances: ['terre'] }, // TODO-BALANCE
  { id: 'magmaton', name: 'Magmaton', family: 'elementaire', hp: 58, attack: 12, weaknesses: ['eau'], resistances: ['feu'] }, // TODO-BALANCE
];

// Biome 4 — La Fibration (famille vermine des réseaux, ressource « optifibre »).
export const VERMINE: MonsterDef[] = [
  { id: 'wyrm', name: 'Wyrm de fibre', family: 'vermine', hp: 36, attack: 11, weaknesses: ['feu'], resistances: ['air'] }, // TODO-BALANCE
  { id: 'vampire-reseau', name: 'Vampire du réseau', family: 'vermine', hp: 45, attack: 12, weaknesses: ['air'], resistances: ['eau'] }, // TODO-BALANCE
  { id: 'drone-corrompu', name: 'Drone corrompu', family: 'vermine', hp: 54, attack: 10, weaknesses: ['eau'], resistances: ['terre'] }, // TODO-BALANCE
  { id: 'tisseuse', name: 'Tisseuse de fil', family: 'vermine', hp: 40, attack: 11, weaknesses: ['terre'], resistances: ['feu'] }, // TODO-BALANCE
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
