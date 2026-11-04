import { createRng } from '../rng';
import type { LevelMap } from './generate';
import type { Position } from '../types';

export function monsterAt(map: LevelMap, pos: Position): number {
  return map.monsters.findIndex((m) => m.pos.x === pos.x && m.pos.y === pos.y);
}

// Contact joueur -> rencontre de 1 à 3 monstres tirés de la famille locale, tirage seedé.
export function pickEncounter(seed: number, floor: number, monsterIndex: number, familyIds: string[]): string[] {
  const rng = createRng((seed ^ (floor * 7919) ^ (monsterIndex * 104729)) >>> 0);
  const count = 1 + rng.int(3);
  const enemies: string[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(rng.pick(familyIds));
  }
  return enemies;
}

// Récolte de ressource : les monstres dans le rayon d'attraction avancent d'une case vers le joueur.
export function attractMonsters(
  map: LevelMap,
  playerPos: Position,
  radius: number,
  walls: (x: number, y: number) => boolean,
): void {
  for (const m of map.monsters) {
    const dist = Math.max(Math.abs(m.pos.x - playerPos.x), Math.abs(m.pos.y - playerPos.y));
    if (dist > radius || dist === 0) continue;
    const dx = Math.sign(playerPos.x - m.pos.x);
    const dy = Math.sign(playerPos.y - m.pos.y);
    const nx = m.pos.x + (Math.abs(playerPos.x - m.pos.x) >= Math.abs(playerPos.y - m.pos.y) ? dx : 0);
    const ny = m.pos.y + (Math.abs(playerPos.y - m.pos.y) > Math.abs(playerPos.x - m.pos.x) ? dy : 0);
    if (!walls(nx, ny) && nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) {
      m.pos = { x: nx, y: ny };
    }
  }
}

// Patrouille simple : va-et-vient sur un axe, en inversant la direction au mur.
// Déterministe (direction stockée sur le monstre), ne se bloque jamais.
// R6-03 twist biome 4 : zones de vitesse appliquées aux monstres comme au joueur —
// zone accélérée (speed 2) = 2 cases par patrouille, zone ralentie (speed 0) = un tour
// sur deux sauté (parité stockée sur le monstre).
export function patrolStep(
  map: LevelMap,
  index: number,
  walls: (x: number, y: number) => boolean,
): void {
  const m = map.monsters[index];
  if (!m) return;
  const zone = map.speedZones.find((z) => z.pos.x === m.pos.x && z.pos.y === m.pos.y);
  if (zone?.speed === 0) {
    m.skipNext = !m.skipNext;
    if (m.skipNext) return; // saute un tour sur deux en zone ralentie
  }
  const axis = m.patrolAxis ?? (index % 2 === 0 ? 'x' : 'y');
  m.patrolAxis = axis;
  const dir = m.patrolDir ?? (index % 2 === 0 ? 1 : -1);
  m.patrolDir = dir;
  const step = (x: number, y: number, d: number): { x: number; y: number } => {
    const nx = axis === 'x' ? x + d : x;
    const ny = axis === 'y' ? y + d : y;
    if (walls(nx, ny) || nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return { x, y };
    return { x: nx, y: ny };
  };
  let next = step(m.pos.x, m.pos.y, dir);
  if (next.x === m.pos.x && next.y === m.pos.y) {
    m.patrolDir = -dir; // rebond
    next = step(m.pos.x, m.pos.y, -dir);
    if (next.x === m.pos.x && next.y === m.pos.y) return;
  }
  // zone accélérée : la patrouille avance d'une case de plus dans la même direction
  if (zone?.speed === 2) {
    const d = m.patrolDir;
    const extra = step(next.x, next.y, d);
    if (extra.x !== next.x || extra.y !== next.y) next = extra;
  }
  m.pos = next;
}
