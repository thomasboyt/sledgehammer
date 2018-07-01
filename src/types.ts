export enum Tile {
  Empty = ' ',
  Wall = 'x',
  Spawn = 'o',
}

export enum ZIndex {
  Pickup,
  Enemy,
  Player,
  Bullet,
  // tile walls and the border around the tile map that prevents wrapped entities from rendering on
  // edges
  World,
  // bullet explosions show up above everything
  BulletExplosion,
  // HUD
  Session,
}

export const colorForSlot = new Map<number, [number, number, number]>([
  [1, [255, 255, 255]],
  [2, [255, 255, 0]],
  [3, [0, 255, 255]],
  [4, [255, 0, 255]],
]);
