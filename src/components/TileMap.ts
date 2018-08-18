import {
  Component,
  Physical,
  Vector2,
  TileMapCollider,
  ITileMap,
  TileCollisionType,
} from 'pearl';
import { addVector } from '../util/math';

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
  worldSize?: Vector2;

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

    const collisionMap: TileCollisionType[][] = this.tiles.map((row) =>
      row.map((value) => {
        if (this.collisionTileTypes.indexOf(value) === -1) {
          return TileCollisionType.Empty;
        } else {
          return TileCollisionType.Wall;
        }
      })
    );

    this.getComponent(TileMapCollider).initializeCollisions(this, collisionMap);
  }

  getTile(position: Vector2): T {
    const wrapped = this.wrapTilePosition(position);
    const tile = this.tiles![wrapped.y][wrapped.x];
    return tile;
  }

  idxToTileCoordinates(idx: number): Vector2 {
    const tx = idx % this.worldSize!.x;
    const ty = Math.floor(idx / this.worldSize!.x);
    return { x: tx, y: ty };
  }

  tileCoordinatesToIdx(tilePos: Vector2): number {
    return tilePos.y * this.worldSize!.x + tilePos.x;
  }

  tileCoordinatesToWorldCenter(tilePos: Vector2): Vector2 {
    const local = this.tileCoordinatesToLocalCenter(tilePos);
    return addVector(this.getComponent(Physical).center, local);
  }

  tileCoordinatesToLocalCenter(tilePos: Vector2): Vector2 {
    const { x, y } = tilePos;

    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
    };
  }

  localCenterToTileCoordinates(center: Vector2): Vector2 {
    const { x, y } = center;

    return {
      x: (x - this.tileSize / 2) / this.tileSize,
      y: (y - this.tileSize / 2) / this.tileSize,
    };
  }

  worldCenterToTileCoordinates(center: Vector2): Vector2 {
    const mapCenter = this.getComponent(Physical).center;
    const local = {
      x: center.x - mapCenter.x,
      y: center.y - mapCenter.y,
    };
    return this.localCenterToTileCoordinates(local);
  }

  forEachTile(cb: (pos: Vector2, value: T) => void): void {
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

  wrapTilePosition(position: Vector2): Vector2 {
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
