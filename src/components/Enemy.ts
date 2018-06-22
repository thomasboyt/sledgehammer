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
import * as PF from 'pathfinding';

import Game from './Game';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import Bullet from './Bullet';
import { addVector, getRandomInt, randomChoice } from '../util/math';
import TileMap from './TileMap';
import Player from './Player';
import WrappedPFGrid from '../util/WrappedPFGrid';

const MOVE_TIME_MS = 240;
const CHASE_TIME_MS = 160;

export default class Enemy extends Component<null> {
  facing: Coordinates = { x: 1, y: 0 };

  chasingPlayer?: GameObject;

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
      let nextTilePos: Coordinates;

      if (this.chasingPlayer) {
        if (this.chasingPlayer.getComponent(Player).playerState === 'dead') {
          this.chasingPlayer = undefined;
        }
      } else {
        // before continuing: can we see a player?
        const entities = this.getEntitiesInSightline(5, ['player']);
        if (entities.length > 0) {
          this.chasingPlayer = entities[0];
        }
      }

      if (this.chasingPlayer) {
        nextTilePos = this.getNextTileChasingPlayer();
      } else {
        nextTilePos = this.getNextTileDefault();
      }

      const currentTilePos = tileEntity.tilePosition;

      this.setFacing({
        x: nextTilePos.x - currentTilePos.x,
        y: nextTilePos.y - currentTilePos.y,
      });

      if (this.chasingPlayer) {
        tileEntity.move(nextTilePos, CHASE_TIME_MS);
      } else {
        tileEntity.move(nextTilePos, MOVE_TIME_MS);
      }
    }
  }

  getNextTileChasingPlayer(): Coordinates {
    const player = this.chasingPlayer!;

    const tileEntity = this.getComponent(TileEntity);
    const tiles = tileEntity.tileMap.tiles;

    const pfTiles = tiles!.map((row) =>
      row.map((cell) => {
        return cell === Tile.Wall ? 1 : 0;
      })
    );

    const grid = new WrappedPFGrid(pfTiles);

    const finder = new PF.DijkstraFinder();

    const playerTilePos = tileEntity.tileMap.wrapTilePosition(
      player.getComponent(TileEntity).tilePosition
    );

    const path = finder.findPath(
      tileEntity.tilePosition.x,
      tileEntity.tilePosition.y,
      Math.floor(playerTilePos.x),
      Math.floor(playerTilePos.y),
      grid
    );

    // TODO: why does this happen sometimes
    const next = path[1] || path[0];

    const nextPos = {
      x: next[0],
      y: next[1],
    };

    // XXX: The pathfinding grid handles wrapping by actually wrapping the coordinates, which is
    // cool, but unfortunately, TileEntity.move() wants moving "off screen" to be handled by
    // actually passing off-screen coordinates. This bit "unwraps" the returned coordinates
    const curPos = tileEntity.tilePosition;
    const worldSize = tileEntity.tileMap.worldSize!;

    const unwrapEdgePositions = (coord: 'x' | 'y') => {
      if (curPos[coord] === 0 && nextPos[coord] === worldSize[coord] - 1) {
        return -1;
      } else if (
        curPos[coord] === worldSize[coord] - 1 &&
        nextPos[coord] === 0
      ) {
        return worldSize[coord];
      }
      return nextPos[coord];
    };

    return {
      x: unwrapEdgePositions('x'),
      y: unwrapEdgePositions('y'),
    };
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
