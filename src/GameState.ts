import { BoundingBox } from './util/collision';

interface Level {}

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
