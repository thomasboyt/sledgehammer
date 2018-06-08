import { BoundingBox } from './util/collision';
import { Vec2 } from './util/math';

export type Tile = 'wall' | 'spawn' | null;

export type EntityType = Tile | 'bullet' | 'player' | 'enemy';

export interface Entity extends BoundingBox {
  type: EntityType;
}

export interface Level {
  tiles: Tile[][];
  spawns: Vec2[];
}

export interface PlayerEntity extends Entity {
  type: 'player';
  status: 'alive' | 'dead';
  color: string;
  vec: [number, number];
  facing: [number, number];
  isMoving: boolean;
  ping?: number;
}

export interface Bullet extends Entity {
  type: 'bullet';
  vec: [number, number];
}

export interface Enemy extends Entity {
  type: 'enemy';
  facing: [number, number];
  isMoving: boolean;
}

export type GameStatus =
  | 'waiting'
  | 'starting'
  | 'playing'
  | 'cleared'
  | 'gameOver';

export interface GameState {
  status: GameStatus;
  startTime?: number;
  pings: Map<number, number>;
}

export interface StageState {
  level: Level;
  players: Map<number, PlayerEntity>;
  bullets: Set<Bullet>;
  enemies: Set<Enemy>;
}

export interface SnapshotState extends StageState, GameState {}
