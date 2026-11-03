import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../../core/run/state';
import type { Position } from '../../core/types';
import { TILE, LOGICAL_WIDTH, LOGICAL_HEIGHT } from './mapConfig';

export class MapScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pos: Position;
  private onMove?: (pos: Position) => void;

  constructor(initialPos: Position, onMove?: (pos: Position) => void) {
    super('map');
    this.pos = { ...initialPos };
    this.onMove = onMove;
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x101828, 1);
    g.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    g.lineStyle(1, 0x24304d, 1);
    for (let x = 0; x <= MAP_WIDTH; x++) {
      g.lineBetween(x * TILE, 0, x * TILE, LOGICAL_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y++) {
      g.lineBetween(0, y * TILE, LOGICAL_WIDTH, y * TILE);
    }
    g.generateTexture('floor', LOGICAL_WIDTH, LOGICAL_HEIGHT);
    g.destroy();
    this.add.image(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 'floor');

    const pg = this.make.graphics({ x: 0, y: 0 }, false);
    pg.fillStyle(0x4f7cff, 1);
    pg.fillRect(0, 0, TILE - 8, TILE - 8);
    pg.generateTexture('player', TILE - 8, TILE - 8);
    pg.destroy();

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
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.z) || Phaser.Input.Keyboard.JustDown(this.keys.w)) dy = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) dy = 1;
    else if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.q) || Phaser.Input.Keyboard.JustDown(this.keys.a)) dx = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) dx = 1;
    if (dx === 0 && dy === 0) return;
    const nx = Phaser.Math.Clamp(this.pos.x + dx, 0, MAP_WIDTH - 1);
    const ny = Phaser.Math.Clamp(this.pos.y + dy, 0, MAP_HEIGHT - 1);
    if (nx === this.pos.x && ny === this.pos.y) return;
    this.pos = { x: nx, y: ny };
    this.player.setPosition(nx * TILE + TILE / 2, ny * TILE + TILE / 2);
    this.onMove?.(this.pos);
  }
}
