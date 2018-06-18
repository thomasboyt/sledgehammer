import { Component, Physical, PolygonCollider, Coordinates } from 'pearl';
import * as SAT from 'sat';
import createCachedRender from '../../src/util/createCachedRender';

interface Options {
  tileSize: number;
}

// interface Tile<T> {
//   pos: Coordinates;
//   center: Coordinates;
//   type: T;
// }

/**
 * Accepts
 */
export default class TileMap<T> extends Component<Options> {
  /**
   * two dimensional array of tiles, indexed by [y][x]
   */
  tiles?: T[][];

  tileSize!: number;

  /**
   * which tiles are considered "collision"
   */
  init(opts: Options) {
    this.tileSize = opts.tileSize;
  }

  getTile(position: Coordinates): T {
    const tile = this.tiles![position.y][position.x];
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
}
