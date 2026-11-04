import { createRng, type Rng } from '../rng';
import { MAP_WIDTH, MAP_HEIGHT } from './grid';
import type { Position } from '../types';

export interface PlacedMonster {
  id: string;
  pos: Position;
  patrolAxis?: 'x' | 'y';
  patrolDir?: number;
  skipNext?: boolean; // R6-03 — zones ralenties : parité de saut de tour
}

export interface PlacedOrb {
  element: 'feu' | 'eau' | 'terre' | 'air';
  pos: Position;
}

export interface Circuit {
  trigger: Position;
  doors: Position[]; // cases mur/porte basculées par le déclencheur
}

export interface Zone {
  pos: Position;
  damage?: number; // zones brûlantes (biome 3)
  speed?: 2 | 0; // zones de vitesse (biome 4) : 2 = accéléré, 0 = ralenti
}

export interface LevelMap {
  width: number;
  height: number;
  walls: boolean[];
  roots: Position[];
  sporeNodes: Position[];
  resourceNodes: Position[]; // R6-01+ : nœuds de la ressource du biome (données, mercurium, optifibre)
  circuits: Circuit[]; // R6-01 : twist biome 2 — déclencheurs qui basculent des portes
  burnZones: Zone[]; // R6-02 : twist biome 3 — sol brûlant télégraphié
  speedZones: Zone[]; // R6-03 : twist biome 4 — zones accélérées/ralenties
  altars: Position[];
  sanctuaries: Position[]; // R7-02 — nœuds de purge de l'instabilité (si modificateur actif)
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

export interface GenerateOpts {
  roots?: boolean;
  monsterCount?: number;
  sporeNodes?: number;
  resourceNodes?: number;
  altars?: number;
  circuits?: { triggers: number; doorsPerTrigger: number };
  burnZones?: { count: number; damage: number };
  speedZones?: { count: number };
  sanctuaries?: number; // R7-02
}

export function generateLevel(
  seed: number,
  floor: number,
  monsterIds: string[] = ['mousse'],
  opts: GenerateOpts = {},
): LevelMap {
  // Retry déterministe : on change la dérive de seed jusqu'à obtenir un niveau connexe.
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = createRng((seed * 31 + floor * 7 + attempt * 101) >>> 0);
    const map: LevelMap = {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      walls: new Array<boolean>(MAP_WIDTH * MAP_HEIGHT).fill(false),
      roots: [],
      sporeNodes: [],
      resourceNodes: [],
      circuits: [],
      burnZones: [],
      speedZones: [],
      altars: [],
      sanctuaries: [],
      entrance: { x: 1, y: 1 },
      exit: { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 },
      monsters: [],
      orbs: [],
      chests: [],
    };
    carve(map, rng);
    map.walls[map.entrance.y * map.width + map.entrance.x] = false;
    map.walls[map.exit.y * map.width + map.exit.x] = false;
    // Twist du biome 1 : des racines bloquent des passages (connexité vérifiée après placement).
    if (opts.roots) {
      const rootCount = 3 + floor; // TODO-BALANCE via BIOME_1_STRUCTURE côté appelant
      const spots = rng.shuffle(freeFloorPositions(map, [map.entrance, map.exit]));
      for (let i = 0; i < Math.min(rootCount, spots.length); i++) {
        const p = spots[i];
        map.walls[p.y * map.width + p.x] = true;
        map.roots.push(p);
      }
    }
    if (!bfsReachable(map, map.entrance, map.exit)) continue;

    // Twist biome 2 : circuits — portes (murs) + déclencheurs. La connexité BFS est
    // garantie dans LES DEUX états (portes ouvertes et portes fermées), même seed = même séquence.
    if (opts.circuits && opts.circuits.triggers > 0) {
      const wallCells: Position[] = [];
      for (let y = 1; y < map.height - 1; y++) {
        for (let x = 1; x < map.width - 1; x++) {
          if (map.walls[y * map.width + x] && !map.roots.some((r) => r.x === x && r.y === y)) wallCells.push({ x, y });
        }
      }
      const freeCells = freeFloorPositions(map, [map.entrance, map.exit]);
      let ok = false;
      for (let attempt2 = 0; attempt2 < 20 && !ok; attempt2++) {
        const rng2 = createRng((seed ^ (floor * 131) ^ (attempt2 * 17) ^ 0xc1cc17) >>> 0);
        const doors = rng2.shuffle([...wallCells]).slice(0, opts.circuits.triggers * opts.circuits.doorsPerTrigger);
        const triggers = rng2.shuffle([...freeCells]).slice(0, opts.circuits.triggers);
        if (doors.length < opts.circuits.triggers * opts.circuits.doorsPerTrigger || triggers.length < opts.circuits.triggers) continue;
        // grouper les portes par déclencheur
        const circuits: Circuit[] = triggers.map((t, i) => ({
          trigger: t,
          doors: doors.slice(i * opts.circuits!.doorsPerTrigger, (i + 1) * opts.circuits!.doorsPerTrigger),
        }));
        // connexité dans les deux états : toutes portes ouvertes, toutes portes fermées
        const allDoors = circuits.flatMap((c) => c.doors);
        const withDoorsOpen = map.walls.map((w, i) => (allDoors.some((d) => d.y * map.width + d.x === i) ? false : w));
        const withDoorsClosed = map.walls.map((w, i) => (allDoors.some((d) => d.y * map.width + d.x === i) ? true : w));
        const mapOpen: LevelMap = { ...map, walls: withDoorsOpen };
        const mapClosed: LevelMap = { ...map, walls: withDoorsClosed };
        if (bfsReachable(mapOpen, map.entrance, map.exit) && bfsReachable(mapClosed, map.entrance, map.exit)) {
          map.circuits = circuits;
          ok = true;
        }
      }
      if (!ok) continue; // retry déterministe au attempt suivant
    }

    const monsterCount = opts.monsterCount ?? Math.min(4 + floor, 99);

    const excluded = [map.entrance, map.exit, ...map.circuits.map((c) => c.trigger)];
    const spots = rng.shuffle(freeFloorPositions(map, excluded));
    let cursor = 0;
    const take = (): Position => spots[cursor++ % spots.length];

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
    const sporeCount = Math.min((opts.sporeNodes ?? 0), Math.max(0, spots.length - cursor));
    for (let i = 0; i < sporeCount; i++) {
      map.sporeNodes.push(take());
    }
    const altarCount = Math.min(opts.altars ?? 0, Math.max(0, spots.length - cursor));
    for (let i = 0; i < altarCount; i++) {
      map.altars.push(take());
    }
    // Nœuds de ressource du biome (biomes 2-4 ; le biome 1 garde ses sporeNodes).
    const resCount = Math.min(opts.resourceNodes ?? 0, Math.max(0, spots.length - cursor));
    for (let i = 0; i < resCount; i++) {
      map.resourceNodes.push(take());
    }
    // Twist biome 3 : zones de sol brûlant, seedées et visibles (dégâts par tour en data).
    if (opts.burnZones && opts.burnZones.count > 0) {
      const bz = Math.min(opts.burnZones.count, Math.max(0, spots.length - cursor));
      for (let i = 0; i < bz; i++) {
        const p = take();
        map.burnZones.push({ pos: p, damage: opts.burnZones.damage });
      }
    }
    // Twist biome 4 : zones de vitesse (2 = accéléré, 0 = ralenti), seedées.
    if (opts.speedZones && opts.speedZones.count > 0) {
      const sz = Math.min(opts.speedZones.count, Math.max(0, spots.length - cursor));
      for (let i = 0; i < sz; i++) {
        const p = take();
        map.speedZones.push({ pos: p, speed: i % 2 === 0 ? 2 : 0 });
      }
    }
    // R7-02 : sanctuaires (purge de la jauge d'instabilité), uniquement si demandé.
    const sanct = Math.min(opts.sanctuaries ?? 0, Math.max(0, spots.length - cursor));
    for (let i = 0; i < sanct; i++) {
      map.sanctuaries.push(take());
    }
    return map;
  }
  throw new Error(`generateLevel: aucun niveau connexe trouvé (seed=${seed}, floor=${floor})`);
}
