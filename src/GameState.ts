import { BoundingBox } from './util/collision';

export type Tile = 'wall' | null;

export type EntityType = Tile | 'bullet' | 'player';

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
  angle: number;
  isMoving: boolean;
  ping?: number;
}

export interface Bullet extends Entity {
  vec: [number, number];
  angle: number;
}

export default interface GameState {
  level: Level;
  players: Map<number, Player>;
  bullets: Bullet[];
  // enemy: Enemies[];
}
