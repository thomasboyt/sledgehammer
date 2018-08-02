import {
  Component,
  Physical,
  Coordinates,
  AnimationManager,
  GameObject,
  SpriteRenderer,
  PolygonShape,
  ShapeCollider,
} from 'pearl';
import * as SAT from 'sat';

import Game from '../Game';
import TileEntity from '../TileEntity';
import { Tile } from '../../types';
import { addVector, getRandomInt, randomChoice } from '../../util/math';
import TileMap from '../TileMap';
import SpawningDyingRenderer from '../SpawningDyingRenderer';
import { DEBUG_RENDER_SIGHTLINES } from '../../constants';

const MOVE_TIME_MS = 320;

export type EnemyState = 'spawning' | 'alive' | 'dead';

export default class BaseEnemy extends Component<null> {
  facing: Coordinates = { x: 1, y: 0 };
  state: EnemyState = 'spawning';

  init() {
    const anim = this.getComponent(AnimationManager);
    anim.set('walking');
    const renderer = this.getComponent(SpriteRenderer);
    renderer.scaleX = 2;
    renderer.scaleY = 2;

    this.getComponent(SpawningDyingRenderer).spawn(() => {
      this.state = 'alive';
    });
  }

  // TODO: dedupe this from Player
  setFacing(coordinates: Coordinates) {
    this.facing = coordinates;

    let angle = Math.atan(this.facing.y / this.facing.x);

    // mirror the X direction if we're going left
    if (this.facing.x < 0) {
      this.getComponent(SpriteRenderer).scaleX = -2;
    } else {
      this.getComponent(SpriteRenderer).scaleX = 2;
    }

    this.getComponent(Physical).angle = angle;
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    if (this.state !== 'alive') {
      return;
    }

    this.updateAlive(dt);
  }

  updateAlive(dt: number) {
    const tileEntity = this.getComponent(TileEntity);

    if (!tileEntity.isMoving) {
      this.nextMove();
    }
  }

  nextMove() {
    const tileEntity = this.getComponent(TileEntity);
    const nextTilePos = this.getNextTileDefault();

    const currentTilePos = tileEntity.tilePosition;

    this.setFacing({
      x: nextTilePos.x - currentTilePos.x,
      y: nextTilePos.y - currentTilePos.y,
    });

    tileEntity.move(nextTilePos, MOVE_TIME_MS);
  }

  getNextTileDefault(): Coordinates {
    const tileEntity = this.getComponent(TileEntity);
    const tileMap = tileEntity.tileMap as TileMap<Tile>;

    const currentTilePos = tileEntity.tilePosition;

    const forwardPos = addVector(currentTilePos, this.facing);
    const ccwPos = addVector(currentTilePos, {
      x: this.facing.y,
      y: -this.facing.x,
    });
    const cwPos = addVector(currentTilePos, {
      x: -this.facing.y,
      y: this.facing.x,
    });

    let nextTilePos: Coordinates;

    /*
      this is gross and can maybe be refactored but the tl;dr is

      if we can go forward
        there's a 1 in 5 chance of trying to turn
        if rand(0, 5) == 0
          turn in a random open direction
          if no open turn directions, just go forward
        else
          go forward
      else
        turn in a random open direction
        if no open turn directions, go backwards
    */

    if (tileMap.getTile(forwardPos) !== Tile.Wall) {
      if (getRandomInt(0, 5) === 0) {
        const candidates = [ccwPos, cwPos].filter((pos) => {
          return tileMap.getTile(pos) !== Tile.Wall;
        });

        if (candidates.length === 0) {
          nextTilePos = forwardPos;
        } else {
          nextTilePos = randomChoice(candidates);
        }
      } else {
        nextTilePos = forwardPos;
      }
    } else {
      const candidates = [ccwPos, cwPos].filter((pos) => {
        return tileMap.getTile(pos) !== Tile.Wall;
      });

      if (candidates.length === 0) {
        nextTilePos = addVector(currentTilePos, {
          x: -this.facing.x,
          y: -this.facing.y,
        });
      } else {
        nextTilePos = randomChoice(candidates);
      }
    }

    return nextTilePos;
  }

  private sightlinePoly?: SAT.Polygon;

  /**
   * Return all entities in sightline
   */
  getEntitiesInSightline(sightlineTileLength: number, tags: string[]) {
    const tileEntity = this.getComponent(TileEntity);
    const tileMap = tileEntity.tileMap;
    const { facing } = this;
    const center = this.getComponent(Physical).center;

    let sightlineLength = sightlineTileLength * tileMap.tileSize;

    for (let i = 0; i < sightlineLength; i += 1) {
      const x = facing.x * i;
      const y = facing.y * i;

      let tilePos = tileMap.worldCenterToTileCoordinates({
        x: center.x + x,
        y: center.y + y,
      });

      tilePos = {
        x: Math.floor(tilePos.x),
        y: Math.floor(tilePos.y),
      };

      if (tileMap.getTile(tilePos) === Tile.Wall) {
        sightlineLength = i;
        break; // this is actually redundant lol
      }
    }

    const taggedEntities = [...this.pearl.entities.all()].filter(
      (obj: GameObject) => {
        return tags.some((tag) => obj.hasTag(tag)) && obj !== this.gameObject;
      }
    );

    const sightlinePoly = PolygonShape.createBox({
      width: sightlineLength,
      height: tileMap.tileSize,
    });

    const phys = this.getComponent(Physical);
    const position = {
      center: addVector(phys.center, {
        x: (this.facing.x * sightlineLength) / 2,
        y: (this.facing.y * sightlineLength) / 2,
      }),
      angle: Math.atan2(facing.y, facing.x),
    };

    const collidingEntities = taggedEntities.filter((entity) => {
      const poly = entity.getComponent(ShapeCollider);
      return poly.testShape(sightlinePoly, position);
    });

    return collidingEntities;
  }

  die() {
    this.state = 'dead';
    const renderer = this.getComponent(SpawningDyingRenderer);
    renderer.die(() => {
      this.pearl.entities.destroy(this.gameObject);
    });
    this.rpcDie();
  }

  rpcDie() {
    if (this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const renderer = this.getComponent(SpawningDyingRenderer);
    renderer.die();
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.sightlinePoly && DEBUG_RENDER_SIGHTLINES) {
      const points = this.sightlinePoly.calcPoints;
      const pos = this.sightlinePoly.pos;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(pos.x + points[0].x, pos.y + points[0].y);
      for (let point of points.slice(1)) {
        ctx.lineTo(pos.x + point.x, pos.y + point.y);
      }

      ctx.closePath();
      ctx.fill();
    }
  }
}
