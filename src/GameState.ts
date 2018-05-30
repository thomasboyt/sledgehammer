interface Level {}

interface Player {
  pos: [number, number];
  color: string;
  keysDown: Set<number>;
}

export default interface GameState {
  level: Level;
  players: Map<number, Player>;
  // bullets: Bullet[];
  // enemy: Enemies[];
}
