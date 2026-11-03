import { createRng, type Rng } from '../rng';
import { MAP_WIDTH, MAP_HEIGHT } from './grid';
import type { Position } from '../types';

export interface PlacedMonster {
  id: string;
  pos: Position;
}

export interface PlacedOrb {
  element: 'feu' | 'eau' | 'terre' | 'air';
  pos: Position;
}

export interface LevelMap {
  width: number;
  height: number;
  walls: boolean[];
  entrance: Position;
  exit: Position;
  monsters: PlacedMonster[];
  orbs: PlacedOrb[];
  chests: Position[];
}

export function isWall(map: LevelMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  return map.walls[y * map.width + x];
}

function bfsReachable(map: LevelMap, from: Position, to: Position): boolean {
  const seen = new Set<number>();
  const queue: Position[] = [from];
  seen.add(from.y * map.width + from.x);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = ny * map.width + nx;
      if (!seen.has(key) && !isWall(map, nx, ny)) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

function carve(map: LevelMap, rng: Rng): void {
  // Bordures + blocs de murs aléatoires, style "salles ouvertes".
  for (let x = 0; x < map.width; x++) {
    map.walls[x] = true;
    map.walls[(map.height - 1) * map.width + x] = true;
  }
  for (let y = 0; y < map.height; y++) {
    map.walls[y * map.width] = true;
    map.walls[y * map.width + map.width - 1] = true;
  }
  const blobCount = rng.int(14) + 8;
  for (let i = 0; i < blobCount; i++) {
    const cx = 1 + rng.int(map.width - 2);
    const cy = 1 + rng.int(map.height - 2);
    const size = rng.int(4) + 2;
    for (let j = 0; j < size; j++) {
      const x = cx + rng.int(3) - 1;
      const y = cy + rng.int(3) - 1;
      if (x > 0 && y > 0 && x < map.width - 1 && y < map.height - 1) {
        map.walls[y * map.width + x] = true;
      }
    }
  }
}

function freeFloorPositions(map: LevelMap, exclude: Position[]): Position[] {
  const out: Position[] = [];
  const excluded = new Set(exclude.map((p) => p.y * map.width + p.x));
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      if (!map.walls[y * map.width + x] && !excluded.has(y * map.width + x)) {
        out.push({ x, y });
      }
    }
  }
  return out;
}

export function generateLevel(seed: number, floor: number, monsterIds: string[] = ['mousse']): LevelMap {
  // Retry déterministe : on change la dérive de seed jusqu'à obtenir un niveau connexe.
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = createRng((seed * 31 + floor * 7 + attempt * 101) >>> 0);
    const map: LevelMap = {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      walls: new Array<boolean>(MAP_WIDTH * MAP_HEIGHT).fill(false),
      entrance: { x: 1, y: 1 },
      exit: { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 },
      monsters: [],
      orbs: [],
      chests: [],
    };
    carve(map, rng);
    map.walls[map.entrance.y * map.width + map.entrance.x] = false;
    map.walls[map.exit.y * map.width + map.exit.x] = false;
    if (!bfsReachable(map, map.entrance, map.exit)) continue;

    const spots = rng.shuffle(freeFloorPositions(map, [map.entrance, map.exit]));
    let cursor = 0;
    const take = (): Position => spots[cursor++ % spots.length];

    const monsterCount = Math.min(4 + floor, spots.length);
    for (let i = 0; i < monsterCount; i++) {
      map.monsters.push({ id: rng.pick(monsterIds), pos: take() });
    }
    const orbCount = Math.min(5 + floor, spots.length - cursor);
    for (let i = 0; i < orbCount; i++) {
      map.orbs.push({ element: rng.pick(['feu', 'eau', 'terre', 'air'] as const), pos: take() });
    }
    const chestCount = Math.min(2, spots.length - cursor);
    for (let i = 0; i < chestCount; i++) {
      map.chests.push(take());
    }
    return map;
  }
  throw new Error(`generateLevel: aucun niveau connexe trouvé (seed=${seed}, floor=${floor})`);
}
