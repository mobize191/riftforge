export type ElementId = 'feu' | 'eau' | 'terre' | 'air';

export type OrbKind = 'primordial' | 'composite';

export interface Orb {
  id: string;
  kind: OrbKind;
  element: ElementId | null;
  tier: number;
}

export type ModuleEffectKind =
  | 'damage'
  | 'shield'
  | 'heal'
  | 'push'
  | 'dot'
  | 'slow'
  | 'blind'
  | 'aoe'
  | 'purify';

export interface ModuleEffect {
  kind: ModuleEffectKind;
  power: number;
  duration?: number;
}

export interface Module {
  id: string;
  name: string;
  tier: number;
  effect: ModuleEffect;
}

export interface Recipe {
  id: string;
  moduleId: string;
  inputs: ElementId[];
  tier: number;
}

export type MonsterFamily = 'spore' | 'gremlin' | 'elementaire' | 'vermine';

export interface MonsterDef {
  id: string;
  name: string;
  family: MonsterFamily;
  hp: number;
  attack: number;
  weaknesses: ElementId[];
  resistances: ElementId[];
}

export type GameMode = 'FORGE' | 'RUN' | 'COMBAT' | 'RETOUR';

export interface ForgeState {
  credits: number;
  essence: number;
  mineraiBrut: number;
}

export interface RunState {
  seed: number;
  floor: number;
  playerLevel: number;
  playerHp: number;
  playerMaxHp: number;
  orbs: Orb[];
  modules: Module[];
}

export interface GameState {
  mode: GameMode;
  forge: ForgeState;
  run: RunState | null;
}
