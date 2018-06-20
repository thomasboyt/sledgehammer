import {
  Component,
  Physical,
  Keys,
  Coordinates,
  PolygonCollider,
  AnimationManager,
} from 'pearl';
import Game from './Game';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import Bullet from './Bullet';
import { addVector, getRandomInt, randomChoice } from '../util/math';
import TileMap from './TileMap';

const MOVE_TIME_MS = 240;

export default class Enemy extends Component<null> {
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
    const tileMap = tileEntity.tileMap as TileMap<Tile>;

    if (!tileEntity.isMoving) {
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

      this.setFacing({
        x: nextTilePos.x - currentTilePos.x,
        y: nextTilePos.y - currentTilePos.y,
      });

      tileEntity.move(nextTilePos, MOVE_TIME_MS);
    }
  }
}
