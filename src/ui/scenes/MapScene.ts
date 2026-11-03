import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../../core/run/grid';
import type { Position } from '../../core/types';
import type { LevelMap } from '../../core/run/generate';
import { monsterAt, patrolStep, pickEncounter } from '../../core/run/encounter';
import { isWall } from '../../core/run/generate';
import { TILE, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './mapConfig';

const ELEMENT_COLORS: Record<string, number> = {
  feu: 0xff5533,
  eau: 0x3399ff,
  terre: 0xaa7744,
  air: 0xdddddd,
};

export class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pos: Position;
  private level: LevelMap;
  private monsterSprites: Phaser.GameObjects.Rectangle[] = [];
  private orbSprites: Phaser.GameObjects.Arc[] = [];
  private seed: number;
  private floor: number;
  private familyIds: string[];
  private onMove?: (pos: Position) => void;
  private onEncounter?: (enemies: string[]) => void;

  constructor(
    level: LevelMap,
    initialPos: Position,
    seed: number,
    floor: number,
    familyIds: string[],
    onMove?: (pos: Position) => void,
    onEncounter?: (enemies: string[]) => void,
  ) {
    super('map');
    this.level = level;
    this.pos = { ...initialPos };
    this.seed = seed;
    this.floor = floor;
    this.familyIds = familyIds;
    this.onMove = onMove;
    this.onEncounter = onEncounter;
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x101828, 1);
    g.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    g.lineStyle(1, 0x24304d, 1);
    for (let x = 0; x <= MAP_WIDTH; x++) g.lineBetween(x * TILE, 0, x * TILE, LOGICAL_HEIGHT);
    for (let y = 0; y <= MAP_HEIGHT; y++) g.lineBetween(0, y * TILE, LOGICAL_WIDTH, y * TILE);
    g.generateTexture('floor', LOGICAL_WIDTH, LOGICAL_HEIGHT);
    g.destroy();
    this.add.image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'floor');

    const wg = this.make.graphics({ x: 0, y: 0 }, false);
    wg.fillStyle(0x2a3a5f, 1);
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (this.level.walls[y * this.level.width + x]) {
          wg.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
    wg.generateTexture('wall', TILE, TILE);
    wg.destroy();
    for (let y = 0; y < this.level.height; y++) {
      for (let x = 0; x < this.level.width; x++) {
        if (this.level.walls[y * this.level.width + x]) {
          this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'wall');
        }
      }
    }

    this.add.rectangle(
      this.level.exit.x * TILE + TILE / 2,
      this.level.exit.y * TILE + TILE / 2,
      TILE - 6,
      TILE - 6,
      0x33dd77,
    );

    for (const orb of this.level.orbs) {
      this.orbSprites.push(
        this.add.circle(
          orb.pos.x * TILE + TILE / 2,
          orb.pos.y * TILE + TILE / 2,
          6,
          ELEMENT_COLORS[orb.element] ?? 0xffffff,
        ),
      );
    }
    for (const chest of this.level.chests) {
      this.add.rectangle(
        chest.x * TILE + TILE / 2,
        chest.y * TILE + TILE / 2,
        TILE - 10,
        TILE - 10,
        0xc9a227,
      );
    }
    this.monsterSprites = this.level.monsters.map((m) =>
      this.add.rectangle(
        m.pos.x * TILE + TILE / 2,
        m.pos.y * TILE + TILE / 2,
        TILE - 8,
        TILE - 8,
        0xdd3355,
      ),
    );

    this.player = this.add.rectangle(
      this.pos.x * TILE + TILE / 2,
      this.pos.y * TILE + TILE / 2,
      TILE - 8,
      TILE - 8,
      0x4f7cff,
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
    }) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(): void {
    let dx = 0;
    let dy = 0;
    const K = Phaser.Input.Keyboard.JustDown;
    if (K(this.keys.up) || K(this.keys.z) || K(this.keys.w)) dy = -1;
    else if (K(this.keys.down) || K(this.keys.s)) dy = 1;
    else if (K(this.keys.left) || K(this.keys.q) || K(this.keys.a)) dx = -1;
    else if (K(this.keys.right) || K(this.keys.d)) dx = 1;
    if (dx === 0 && dy === 0) return;
    const nx = Phaser.Math.Clamp(this.pos.x + dx, 0, MAP_WIDTH - 1);
    const ny = Phaser.Math.Clamp(this.pos.y + dy, 0, MAP_HEIGHT - 1);
    if ((nx === this.pos.x && ny === this.pos.y) || isWall(this.level, nx, ny)) return;
    this.pos = { x: nx, y: ny };
    this.player.setPosition(nx * TILE + TILE / 2, ny * TILE + TILE / 2);
    this.onMove?.(this.pos);

    const walls = (x: number, y: number) => isWall(this.level, x, y);
    for (let i = 0; i < this.level.monsters.length; i++) {
      patrolStep(this.level, i, walls);
      const m = this.level.monsters[i];
      this.monsterSprites[i]?.setPosition(m.pos.x * TILE + TILE / 2, m.pos.y * TILE + TILE / 2);
    }

    const idx = monsterAt(this.level, this.pos);
    if (idx >= 0) {
      this.onEncounter?.(pickEncounter(this.seed, this.floor, idx, this.familyIds));
    }
  }
}
