import { BoundingBox } from './util/collision';

export type Tile = 'wall' | null;

export interface Level {
  tiles: Tile[][];
}

export interface Player {
  box: BoundingBox;
  color: string;
  keysDown: Set<number>;
}

export default interface GameState {
  level: Level;
  players: Map<number, Player>;
  // bullets: Bullet[];
  // enemy: Enemies[];
}
