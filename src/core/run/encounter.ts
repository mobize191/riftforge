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

// Patrouille simple : va-et-vient horizontal ou vertical, en restant sur du sol libre.
export function patrolStep(
  map: LevelMap,
  index: number,
  walls: (x: number, y: number) => boolean,
): void {
  const m = map.monsters[index];
  if (!m) return;
  const rng = createRng((index * 2654435761) >>> 0);
  const axis = index % 2 === 0 ? 'x' : 'y';
  const dir = rng.next() < 0.5 ? 1 : -1;
  const nx = axis === 'x' ? m.pos.x + dir : m.pos.x;
  const ny = axis === 'y' ? m.pos.y + dir : m.pos.y;
  if (!walls(nx, ny) && nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) {
    m.pos = { x: nx, y: ny };
  }
}
