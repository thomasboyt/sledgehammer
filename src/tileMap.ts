import { Vec2 } from './util/math';
import { WORLD_SIZE_HEIGHT, WORLD_SIZE_WIDTH, TILE_SIZE } from './constants';
import { Tile, Entity } from './GameState';

export function getTile(tiles: Tile[][], [x, y]: Vec2): Tile {
  return tiles[wrapTileY(y)][wrapTileX(x)];
}

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

export function tilesToCollisionEntities(tiles: Tile[][]): Entity[] {
  const collisionEntities: Entity[] = [];

  for (let y = 0; y < tiles.length; y += 1) {
    const tileRow = tiles[y];
    for (let x = 0; x < tileRow.length; x += 1) {
      const tile = tileRow[x];
      if (tile === 'wall') {
        collisionEntities.push({
          type: 'wall',
          center: [
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
          ],
          width: TILE_SIZE,
          height: TILE_SIZE,
        });
      }
    }
  }

  return collisionEntities;
}
