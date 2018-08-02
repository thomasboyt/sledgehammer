import { Component, Physical, Coordinates } from 'pearl';
import { addVector } from '../util/math';
import TileMapCollider, { ITileMap } from './TileMapCollider';

interface Options<T> {
  tileSize: number;
  collisionTileTypes: T[];
}

export default class TileMap<T> extends Component<Options<T>>
  implements ITileMap {
  /**
   * two dimensional array of tiles, indexed by [y][x]
   */
  tiles?: T[][];
  collisionTileTypes!: T[];

  tileSize!: number;
  tileWidth!: number;
  tileHeight!: number;
  worldSize?: Coordinates;

  create(opts: Options<T>) {
    this.tileSize = this.tileWidth = this.tileHeight = opts.tileSize;
    this.collisionTileTypes = opts.collisionTileTypes;
  }

  setTiles(tiles: T[][]) {
    this.tiles = tiles;

    this.worldSize = {
      x: this.tiles[0].length,
      y: this.tiles.length,
    };

    const collisionMap: boolean[] = [];

    this.forEachTile(({ x, y }, value) => {
      if (this.collisionTileTypes.indexOf(value) === -1) {
        collisionMap.push(false);
      } else {
        collisionMap.push(true);
      }
    });

    this.getComponent(TileMapCollider).initializeCollisions(this, collisionMap);
  }

  getTile(position: Coordinates): T {
    const wrapped = this.wrapTilePosition(position);
    const tile = this.tiles![wrapped.y][wrapped.x];
    return tile;
  }

  idxToTileCoordinates(idx: number): Coordinates {
    const tx = idx % this.worldSize!.x;
    const ty = Math.floor(idx / this.worldSize!.x);
    return { x: tx, y: ty };
  }

  tileCoordinatesToIdx(tilePos: Coordinates): number {
    return tilePos.y * this.worldSize!.x + tilePos.x;
  }

  tileCoordinatesToWorldCenter(tilePos: Coordinates): Coordinates {
    const local = this.tileCoordinatesToLocalCenter(tilePos);
    return addVector(this.getComponent(Physical).center, local);
  }

  tileCoordinatesToLocalCenter(tilePos: Coordinates): Coordinates {
    const { x, y } = tilePos;

    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
    };
  }

  localCenterToTileCoordinates(center: Coordinates): Coordinates {
    const { x, y } = center;

    return {
      x: (x - this.tileSize / 2) / this.tileSize,
      y: (y - this.tileSize / 2) / this.tileSize,
    };
  }

  worldCenterToTileCoordinates(center: Coordinates): Coordinates {
    const mapCenter = this.getComponent(Physical).center;
    const local = {
      x: center.x - mapCenter.x,
      y: center.y - mapCenter.y,
    };
    return this.localCenterToTileCoordinates(local);
  }

  forEachTile(cb: (pos: Coordinates, value: T) => void): void {
    const tiles = this.tiles;

    if (!tiles) {
      throw new Error('tried to iterate over tiles but no tiles set');
    }

    for (let y = 0; y < tiles.length; y += 1) {
      for (let x = 0; x < tiles[y].length; x += 1) {
        cb({ x, y }, tiles[y][x]);
      }
    }
  }

  wrapTilePosition(position: Coordinates): Coordinates {
    const wrap = (n: number, bound: number): number => {
      if (n < 0) {
        return bound - 1;
      } else if (n >= bound) {
        return 0;
      } else {
        return n;
      }
    };

    return {
      x: wrap(position.x, this.worldSize!.x),
      y: wrap(position.y, this.worldSize!.y),
    };
  }
}
