import { BoundingBox } from './util/collision';

export type Tile = 'wall' | null;

export type EntityType = Tile | 'bullet' | 'player' | 'enemy';

export interface Entity extends BoundingBox {
  type: EntityType;
}

export interface Level {
  tiles: Tile[][];
}

export interface Player extends Entity {
  type: 'player';
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

export default interface GameState {
  level: Level;
  players: Map<number, Player>;
  bullets: Bullet[];
  enemies: Enemy[];
}
