import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../../core/run/grid';
import type { Position } from '../../core/types';
import type { LevelMap, PlacedMonster } from '../../core/run/generate';
import { monsterAt, patrolStep, pickEncounter } from '../../core/run/encounter';
import { isWall } from '../../core/run/generate';
import { TILE, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './mapConfig';
import { PORTRAIT_DIR, PORTRAIT_FILE, entityIdOf } from '../portraits';

const ELEMENT_COLORS: Record<string, number> = {
  feu: 0xff5533,
  eau: 0x3399ff,
  terre: 0xaa7744,
  air: 0xdddddd,
};

function hex(c: string): number {
  return parseInt(c.slice(1), 16);
}

// Textures générées en code (formes simples), teintées selon la palette du biome
// courant (R6-09 — identité visuelle par biome, voir src/data/biomes.ts BIOME_PALETTES).
function makeTextures(scene: Phaser.Scene, palette: { floor: string; wall: string; accent: string; monster: string }): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(hex(palette.floor), 1);
  g.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  g.lineStyle(1, hex(palette.wall), 1);
  for (let x = 0; x <= MAP_WIDTH; x++) g.lineBetween(x * TILE, 0, x * TILE, LOGICAL_HEIGHT);
  for (let y = 0; y <= MAP_HEIGHT; y++) g.lineBetween(0, y * TILE, LOGICAL_WIDTH, y * TILE);
  g.generateTexture('floor', LOGICAL_WIDTH, LOGICAL_HEIGHT);
  g.clear();
  g.fillStyle(hex(palette.wall), 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(2, hex(palette.accent), 1);
  g.strokeRect(1, 1, TILE - 2, TILE - 2);
  g.generateTexture('wall', TILE, TILE);
  g.clear();
  // racine (twist du biome 1)
  g.fillStyle(0x4a3520, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(3, 0x6b4f2a, 1);
  g.beginPath();
  g.moveTo(TILE / 2, 0);
  g.lineTo(TILE / 2 - 4, TILE / 2);
  g.lineTo(TILE / 2 + 5, TILE);
  g.strokePath();
  g.generateTexture('root', TILE, TILE);
  g.clear();
  // joueur : corps + visière
  g.fillStyle(0x4f7cff, 1);
  g.fillRoundedRect(2, 6, TILE - 10, TILE - 8, 5);
  g.fillStyle(0x0a0e1a, 1);
  g.fillRect(TILE / 2 - 1, 8, 8, 4);
  g.fillStyle(0x9fc0ff, 1);
  g.fillRect(TILE / 2, 9, 6, 2);
  g.generateTexture('player', TILE - 4, TILE - 4);
  g.clear();
  // monstre : boule + yeux (couleur du biome)
  g.fillStyle(hex(palette.monster), 1);
  g.fillCircle(TILE / 2, TILE / 2 + 2, TILE / 2 - 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(TILE / 2 - 4, TILE / 2, 3);
  g.fillCircle(TILE / 2 + 4, TILE / 2, 3);
  g.fillStyle(0x220000, 1);
  g.fillCircle(TILE / 2 - 4, TILE / 2, 1.5);
  g.fillCircle(TILE / 2 + 4, TILE / 2, 1.5);
  g.generateTexture('monster', TILE - 4, TILE - 4);
  g.clear();
  // orbe : sphère brillante
  for (const [el, color] of Object.entries(ELEMENT_COLORS)) {
    g.fillStyle(color, 1);
    g.fillCircle(TILE / 2, TILE / 2, 7);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(TILE / 2 - 2, TILE / 2 - 2, 2.5);
    g.generateTexture(`orb-${el}`, 20, 20);
    g.clear();
  }
  // coffre
  g.fillStyle(0xc9a227, 1);
  g.fillRoundedRect(3, 10, TILE - 6, TILE - 14, 2);
  g.fillStyle(0x8a6d1a, 1);
  g.fillRect(3, 8, TILE - 6, 5);
  g.fillStyle(0xfff2b0, 1);
  g.fillRect(TILE / 2 - 2, 8, 4, 6);
  g.generateTexture('chest', TILE, TILE);
  g.clear();
  // spore : nœud vert
  g.fillStyle(0x2f7a4d, 1);
  g.fillCircle(TILE / 2, TILE / 2, 8);
  g.fillStyle(0x66ff99, 1);
  g.fillCircle(TILE / 2 - 2, TILE / 2 - 3, 3);
  g.generateTexture('spore', 20, 20);
  g.clear();
  // autel
  g.fillStyle(0x7a5cff, 1);
  g.fillTriangle(TILE / 2, 4, 4, TILE - 4, TILE - 4, TILE - 4);
  g.fillStyle(0xb9a6ff, 1);
  g.fillCircle(TILE / 2, 10, 3);
  g.generateTexture('altar', TILE, TILE);
  g.clear();
  // sortie : portail
  g.lineStyle(4, 0x33dd77, 1);
  g.strokeCircle(TILE / 2, TILE / 2, TILE / 2 - 4);
  g.fillStyle(0x33dd77, 0.35);
  g.fillCircle(TILE / 2, TILE / 2, TILE / 2 - 4);
  g.generateTexture('exit', TILE - 4, TILE - 4);
  g.destroy();
}

export class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pos: Position;
  private levelRef: { current: LevelMap };
  private get level(): LevelMap {
    return this.levelRef.current;
  }
  private monsterSprites = new Map<number, Phaser.GameObjects.Image>();
  private orbSprites = new Map<string, Phaser.GameObjects.Image>();
  private chestSprites = new Map<string, Phaser.GameObjects.Image>();
  private sporeSprites = new Map<string, Phaser.GameObjects.Image>();
  private altarSprites = new Map<string, Phaser.GameObjects.Image>();
  private seed: number;
  private floor: number;
  private familyIds: string[];
  private palette: { floor: string; wall: string; accent: string; monster: string };
  private onMove?: (pos: Position) => void;
  private onEncounter?: (enemies: string[]) => void;
  private onInteract?: () => void;

  constructor(
    levelRef: { current: LevelMap },
    initialPos: Position,
    seed: number,
    floor: number,
    familyIds: string[],
    palette: { floor: string; wall: string; accent: string; monster: string },
    onMove?: (pos: Position) => void,
    onEncounter?: (enemies: string[]) => void,
    onInteract?: () => void,
  ) {
    super('map');
    this.levelRef = levelRef;
    this.pos = { ...initialPos };
    this.seed = seed;
    this.floor = floor;
    this.familyIds = familyIds;
    this.palette = palette;
    this.onMove = onMove;
    this.onEncounter = onEncounter;
    this.onInteract = onInteract;
  }

  private keyOf = (p: Position) => `${p.x},${p.y}`;

  // R9-07 : sprites de carte = portraits IA downscalés en 32 px quand le PNG est présent ;
  // sinon le fallback code-gen (texture 'monster'/'player' générée en dessous) est utilisé.
  preload(): void {
    const ids = new Set<string>(['heros', ...this.level.monsters.map((m) => entityIdOf(m.id))]);
    for (const id of ids) {
      const file = PORTRAIT_FILE[id];
      if (file) this.load.image(`p-${id}`, `${PORTRAIT_DIR}/${file}`);
    }
  }

  private spriteFor(id: string, fallback: string): string {
    return this.textures.exists(`p-${id}`) ? `p-${id}` : fallback;
  }

  create(): void {
    makeTextures(this, this.palette);
    this.add.image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'floor');

    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (this.level.walls[y * this.level.width + x]) {
          const isRoot = this.level.roots.some((r) => r.x === x && r.y === y);
          this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, isRoot ? 'root' : 'wall');
        }
      }
    }

    this.add.image(this.level.exit.x * TILE + TILE / 2, this.level.exit.y * TILE + TILE / 2, 'exit');

    for (const orb of this.level.orbs) {
      const spr = this.add.image(
        orb.pos.x * TILE + TILE / 2,
        orb.pos.y * TILE + TILE / 2,
        `orb-${orb.element}`,
      );
      this.orbSprites.set(this.keyOf(orb.pos), spr);
    }
    for (const chest of this.level.chests) {
      const spr = this.add.image(chest.x * TILE + TILE / 2, chest.y * TILE + TILE / 2, 'chest');
      this.chestSprites.set(this.keyOf(chest), spr);
    }
    for (const spore of this.level.sporeNodes) {
      const spr = this.add.image(spore.x * TILE + TILE / 2, spore.y * TILE + TILE / 2, 'spore');
      this.sporeSprites.set(this.keyOf(spore), spr);
    }
    for (const altar of this.level.altars) {
      const spr = this.add.image(altar.x * TILE + TILE / 2, altar.y * TILE + TILE / 2, 'altar');
      this.altarSprites.set(this.keyOf(altar), spr);
    }
    this.level.monsters.forEach((m, i) => {
      const spr = this.add.image(
        m.pos.x * TILE + TILE / 2,
        m.pos.y * TILE + TILE / 2,
        this.spriteFor(entityIdOf(m.id), 'monster'),
      );
      this.monsterSprites.set(i, spr);
    });

    this.player = this.add.image(
      this.pos.x * TILE + TILE / 2,
      this.pos.y * TILE + TILE / 2,
      this.spriteFor('heros', 'player'),
    );

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.cameras.main.setBounds(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      z: Phaser.Input.Keyboard.KeyCodes.Z,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      e: Phaser.Input.Keyboard.KeyCodes.E,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  // Synchronise les sprites avec le niveau du core (objets ramassés, monstres retirés).
  private syncSprites(): void {
    const seenOrbs = new Set(this.level.orbs.map((o) => this.keyOf(o.pos)));
    for (const [k, spr] of this.orbSprites) {
      if (!seenOrbs.has(k)) {
        spr.destroy();
        this.orbSprites.delete(k);
      }
    }
    const seenChests = new Set(this.level.chests.map((c) => this.keyOf(c)));
    for (const [k, spr] of this.chestSprites) {
      if (!seenChests.has(k)) {
        spr.destroy();
        this.chestSprites.delete(k);
      }
    }
    const seenSpores = new Set(this.level.sporeNodes.map((p) => this.keyOf(p)));
    for (const [k, spr] of this.sporeSprites) {
      if (!seenSpores.has(k)) {
        spr.destroy();
        this.sporeSprites.delete(k);
      }
    }
    const seenAltar = new Set(this.level.altars.map((a) => this.keyOf(a)));
    for (const [k, spr] of this.altarSprites) {
      if (!seenAltar.has(k)) {
        spr.destroy();
        this.altarSprites.delete(k);
      }
    }
    // monstres : rapproche les sprites des monstres restants (index -> position courante)
    const alive = this.level.monsters;
    const sprites = [...this.monsterSprites.values()];
    for (let i = sprites.length - 1; i >= alive.length; i--) {
      sprites[i]?.destroy();
      this.monsterSprites.delete(i);
    }
    alive.forEach((m: PlacedMonster, i: number) => {
      const spr = this.monsterSprites.get(i) ?? this.add.image(0, 0, this.spriteFor(entityIdOf(m.id), 'monster'));
      this.monsterSprites.set(i, spr);
      spr.setTexture(this.spriteFor(entityIdOf(m.id), 'monster'));
      spr.setPosition(m.pos.x * TILE + TILE / 2, m.pos.y * TILE + TILE / 2);
    });
  }

  // Un pas de déplacement (clavier OU tactile) : la scène reste la source de vérité de la position.
  tryMove(dx: number, dy: number): void {
    if (!this.player) return; // B36 : create() pas encore terminé (redémarrage de scène) -> on ignore le pas
    const nx = Phaser.Math.Clamp(this.pos.x + dx, 0, MAP_WIDTH - 1);
    const ny = Phaser.Math.Clamp(this.pos.y + dy, 0, MAP_HEIGHT - 1);
    if ((nx === this.pos.x && ny === this.pos.y) || isWall(this.level, nx, ny)) return;
    this.pos = { x: nx, y: ny };
    this.player.setPosition(nx * TILE + TILE / 2, ny * TILE + TILE / 2);
    this.onMove?.(this.pos);

    const walls = (x: number, y: number) => isWall(this.level, x, y);
    for (let i = 0; i < this.level.monsters.length; i++) {
      patrolStep(this.level, i, walls);
    }
    this.syncSprites();

    // Combat automatique au contact : même case OU case adjacente (4 directions).
    let idx = monsterAt(this.level, this.pos);
    if (idx < 0) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const j = monsterAt(this.level, { x: this.pos.x + dx, y: this.pos.y + dy });
        if (j >= 0) {
          idx = j;
          break;
        }
      }
    }
    if (idx >= 0) {
      this.onEncounter?.(pickEncounter(this.seed, this.floor, idx, this.familyIds));
    }
  }

  interact(): void {
    this.onInteract?.();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) this.interact();
    let dx = 0;
    let dy = 0;
    const K = Phaser.Input.Keyboard.JustDown;
    if (K(this.keys.up) || K(this.keys.z) || K(this.keys.w)) dy = -1;
    else if (K(this.keys.down) || K(this.keys.s)) dy = 1;
    else if (K(this.keys.left) || K(this.keys.q) || K(this.keys.a)) dx = -1;
    else if (K(this.keys.right) || K(this.keys.d)) dx = 1;
    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
    this.syncSprites();
  }
}
