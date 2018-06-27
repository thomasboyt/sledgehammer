import {
  Component,
  Physical,
  Keys,
  Coordinates,
  PolygonCollider,
  AnimationManager,
  GameObject,
} from 'pearl';
import * as SAT from 'sat';

import Game from '../Game';
import TileEntity from '../TileEntity';
import { Tile } from '../../types';
import Bullet from '../Bullet';
import { addVector, getRandomInt, randomChoice } from '../../util/math';
import TileMap from '../TileMap';
import Player from '../Player';

const MOVE_TIME_MS = 320;

export default class BaseEnemy extends Component<null> {
  facing: Coordinates = { x: 1, y: 0 };

  init() {
    const anim = this.getComponent(AnimationManager);
    anim.set('walking');
    anim.setScale(2, 2);
  }

  // TODO: dedupe this from Player
  setFacing(coordinates: Coordinates) {
    this.facing = coordinates;

    let angle = Math.atan(this.facing.y / this.facing.x);

    // mirror the X direction if we're going left
    if (this.facing.x < 0) {
      this.getComponent(AnimationManager).setScale(-2, 2);
    } else {
      this.getComponent(AnimationManager).setScale(2, 2);
    }

    this.getComponent(Physical).angle = angle;
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

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

  /**
   * Return all entities in sightline
   * NOTE: `facing` here is just a unit vector of the direction faced, but it has to be a 90
   * degree angle, or this will not work
   * ALSO NOTE: this only properly works when the enemy is actually aligned with a tile
   * it'll sorta work if the player's between tiles but idk
   */
  getEntitiesInSightline(sightlineTileLength: number, tags: string[]) {
    const tileEntity = this.getComponent(TileEntity);
    const tileMap = tileEntity.tileMap;
    const { facing } = this;

    // Cut sightline down to not include walled tiles
    for (let i = 1; i <= sightlineTileLength; i += 1) {
      const pos = {
        x: tileEntity.tilePosition.x + i * facing.x,
        y: tileEntity.tilePosition.y + i * facing.y,
      };

      if (tileMap.getTile(pos) === Tile.Wall) {
        sightlineTileLength = i - 1;
      }
    }

    const taggedEntities = [...this.pearl.entities.all()].filter(
      (obj: GameObject) => {
        return tags.some((tag) => obj.hasTag(tag));
      }
    );

    const collidingEntities = taggedEntities.filter((entity) => {
      const poly = entity.getComponent(PolygonCollider).getSATPolygon();

      for (let i = 1; i <= sightlineTileLength; i += 1) {
        const pos = {
          x: tileEntity.tilePosition.x + i * facing.x,
          y: tileEntity.tilePosition.y + i * facing.y,
        };

        const tilePoly = new SAT.Box(
          new SAT.Vector(
            pos.x * tileMap.tileSize - tileMap.tileSize / 2,
            pos.y * tileMap.tileSize - tileMap.tileSize / 2
          ),
          tileMap.tileSize,
          tileMap.tileSize
        ).toPolygon();

        if (SAT.testPolygonPolygon(poly, tilePoly)) {
          return true;
        }
      }

      return false;
    });

    return collidingEntities;
  }
}
