import { Entity, Vector2 } from 'pearl';
import * as PF from 'pathfinding';

import WrappedPFGrid from '../../util/WrappedPFGrid';

import BaseEnemy from './BaseEnemy';
import Player from '../Player';
import TileEntity from '../TileEntity';
import { Tile } from '../../types';

const MOVE_TIME_MS = 320;
const CHASE_TIME_MS = 160;

export default class ChaseEnemy extends BaseEnemy {
  chasingPlayer?: Entity;

  nextMove() {
    const tileEntity = this.getComponent(TileEntity);

    let nextTilePos: Vector2;

    if (!this.chasingPlayer) {
      // before continuing: can we see a player?
      const entities = this.getEntitiesInSightline(5, ['player']);
      if (entities.length > 0) {
        this.chasingPlayer = entities[0];
      }
    }

    if (
      this.chasingPlayer &&
      this.chasingPlayer.getComponent(Player).playerState !== 'alive'
    ) {
      this.chasingPlayer = undefined;
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

  getNextTileChasingPlayer(): Vector2 {
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

    // XXX: The pathfinding grid handles wrapping by actually wrapping the
    // coordinates, which is cool, but unfortunately, TileEntity.move() wants
    // moving "off screen" to be handled by actually passing off-screen
    // coordinates. This bit "unwraps" the returned coordinates
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
}
