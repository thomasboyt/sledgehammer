import {
  Component,
  CollisionResponse,
  PolygonShape,
  Collider,
  CollisionShape,
  Position,
  Coordinates,
  Physical,
} from 'pearl';

interface TileCollisionInformation {
  polygon: PolygonShape;
  position: Position;
  activeEdges: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
}

export interface ITileMap {
  idxToTileCoordinates(idx: number): Coordinates;
  tileCoordinatesToIdx(tilePos: Coordinates): number;
  tileWidth: number;
  tileHeight: number;
}

export default class TileMapCollider extends Collider {
  isEnabled = true;
  isTrigger = false;

  collisionMap: (TileCollisionInformation | null)[] = [];

  create() {
    this.gameObject.registerCollider(this);
  }

  initializeCollisions(tileMap: ITileMap, collisionMap: boolean[]) {
    this.collisionMap = collisionMap.map((isCollision, idx, arr) => {
      if (isCollision) {
        // check siblings
        const { x, y } = tileMap.idxToTileCoordinates(idx);
        const north = arr[tileMap.tileCoordinatesToIdx({ x, y: y - 1 })];
        const south = arr[tileMap.tileCoordinatesToIdx({ x, y: y + 1 })];
        const west = arr[tileMap.tileCoordinatesToIdx({ x: x - 1, y })];
        const east = arr[tileMap.tileCoordinatesToIdx({ x: x + 1, y })];

        const worldX = x * tileMap.tileWidth;
        const worldY = y * tileMap.tileHeight;

        const polygon = PolygonShape.createBox({
          width: tileMap.tileWidth,
          height: tileMap.tileHeight,
        });

        return {
          polygon,
          position: {
            center: {
              x: worldX + tileMap.tileWidth / 2,
              y: worldY + tileMap.tileHeight / 2,
            },
          },
          activeEdges: {
            top: !north,
            left: !west,
            right: !east,
            bottom: !south,
          },
        };
      } else {
        return null;
      }
    });
  }

  // TODO: Allow non-rectangular tiles
  testShape(shape: CollisionShape, otherPosition: Position) {
    const phys = this.gameObject.maybeGetComponent(Physical);
    const worldCenter = phys ? phys.center : { x: 0, y: 0 };

    for (let idx = 0; idx < this.collisionMap.length; idx += 1) {
      const collisionInfo = this.collisionMap[idx];
      if (!collisionInfo) {
        continue;
      }

      const tilePolygonShape = collisionInfo.polygon;

      const worldPosition = {
        ...collisionInfo.position,
        center: {
          x: collisionInfo.position.center.x + worldCenter.x,
          y: collisionInfo.position.center.y + worldCenter.y,
        },
      };

      // TODO: should this be inverted?
      const resp = tilePolygonShape.testShape(
        shape,
        worldPosition,
        otherPosition
      );

      if (resp && resp.overlap > 0) {
        return resp;
      }
    }
  }
}
