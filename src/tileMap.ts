import { Vec2 } from './util/math';
import { WORLD_SIZE_HEIGHT, WORLD_SIZE_WIDTH, TILE_SIZE } from './constants';
import { Tile } from './GameState';

export const getTile = (tiles: Tile[][], x: number, y: number) => {
  return tiles[wrapTileY(y)][wrapTileX(x)];
};

export const wrapTileX = (n: number) => {
  if (n < 0) {
    return WORLD_SIZE_WIDTH - 1;
  } else if (n >= WORLD_SIZE_WIDTH) {
    return 0;
  } else {
    return n;
  }
};

export const wrapTileY = (n: number) => {
  if (n < 0) {
    return WORLD_SIZE_HEIGHT - 1;
  } else if (n >= WORLD_SIZE_HEIGHT) {
    return 0;
  } else {
    return n;
  }
};

export const wrapTileCoordinates = (tile: Vec2): Vec2 => {
  return [wrapTileX(tile[0]), wrapTileY(tile[1])];
};

export function centerToTile(center: [number, number]): [number, number] {
  return [
    (center[0] - TILE_SIZE / 2) / TILE_SIZE,
    (center[1] - TILE_SIZE / 2) / TILE_SIZE,
  ];
}

export function tileToCenter(tile: [number, number]): [number, number] {
  return [
    tile[0] * TILE_SIZE + TILE_SIZE / 2,
    tile[1] * TILE_SIZE + TILE_SIZE / 2,
  ];
}
