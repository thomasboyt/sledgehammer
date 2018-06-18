import { Component, Physical, PolygonCollider, Coordinates } from 'pearl';
import * as SAT from 'sat';
import createCachedRender from '../../src/util/createCachedRender';

interface Options {
  tileSize: number;
}

/**
 * Accepts
 */
export default class TileMap<T> extends Component<Options> {
  /**
   * two dimensional array of tiles, indexed by [y][x]
   */
  tiles?: T[][];

  tileSize!: number;
  worldSize?: Coordinates;

  /**
   * which tiles are considered "collision"
   */
  init(opts: Options) {
    this.tileSize = opts.tileSize;
  }

  setTiles(tiles: T[][]) {
    this.tiles = tiles;

    this.worldSize = {
      x: this.tiles[0].length,
      y: this.tiles.length,
    };
  }

  getTile(position: Coordinates): T {
    const wrapped = this.wrapTilePosition(position);
    const tile = this.tiles![wrapped.y][wrapped.x];
    return tile;
  }

  tileCoordinatesToCenter(tilePos: Coordinates): Coordinates {
    const { x, y } = tilePos;

    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
    };
  }

  centerToTileCoordinates(center: Coordinates): Coordinates {
    const { x, y } = center;

    return {
      x: (x - this.tileSize / 2) / this.tileSize,
      y: (y - this.tileSize / 2) / this.tileSize,
    };
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

  /**
   * Test whether some Collider is intersecting with one of the tiles passed
   * This is hacky as hell rn because of how collision was implemented
   */
  isColliding(collider: PolygonCollider, collidingTiles: T[]): boolean {
    const phys = collider.getComponent(Physical);
    const poly = collider.getSATPolygon();

    let isColliding = false;
    this.forEachTile((tilePos, value) => {
      if (collidingTiles.indexOf(value) === -1) {
        return;
      }

      const center = this.tileCoordinatesToCenter(tilePos);

      const tilePoly = new SAT.Box(
        new SAT.Vector(
          center.x - this.tileSize / 2,
          center.y - this.tileSize / 2
        ),
        this.tileSize,
        this.tileSize
      ).toPolygon();

      if (SAT.testPolygonPolygon(poly, tilePoly)) {
        isColliding = true;
      }
    });

    return isColliding;
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
