export enum Tile {
  Empty = ' ',
  Wall = 'x',
  Spawn = 'o',
}

export enum ZIndex {
  Pickup,
  Player,
  Enemy,
  // tile walls and the border around the tile map that prevents wrapped entities from rendering on
  // edges
  World,
  // bullet explosions show up above everything
  BulletExplosion,
  // HUD
  Session,
}
