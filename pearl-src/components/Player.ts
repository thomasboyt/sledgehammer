import { Component, Physical, Keys, Coordinates } from 'pearl';
import Game from './Game';
import NetworkingHost from './networking/NetworkingHost';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import Bullet from './Bullet';

const MOVE_TIME_MS = 120;
const BULLET_SPEED = 0.2;

const addVector = (vec1: Coordinates, vec2: Coordinates): Coordinates => {
  return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
};

export interface PlayerSnapshot {
  center: Coordinates;
  vel: Coordinates;
  worldId: string;
}

export interface Options {
  playerId: number;
}

export default class Player extends Component<Options> {
  playerId!: number;
  facing: Coordinates = { x: 1, y: 0 };

  init(opts: Options) {
    if (opts) {
      this.playerId = opts.playerId;
    }
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const players = this.pearl.obj.getComponent(NetworkingHost).players;
    const networkedPlayer = players.get(this.playerId)!;
    const inputter = networkedPlayer.inputter;

    let inputDirection: Coordinates | null = null;

    if (inputter.isKeyDown(Keys.rightArrow)) {
      inputDirection = { x: 1, y: 0 };
    } else if (inputter.isKeyDown(Keys.leftArrow)) {
      inputDirection = { x: -1, y: 0 };
    } else if (inputter.isKeyDown(Keys.upArrow)) {
      inputDirection = { x: 0, y: -1 };
    } else if (inputter.isKeyDown(Keys.downArrow)) {
      inputDirection = { x: 0, y: 1 };
    }

    if (inputDirection) {
      this.movePlayer(inputDirection);
    }

    // for (let enemy of this.state.enemies) {
    //   if (isColliding(player, enemy)) {
    //     player.status = 'dead';
    //     return;
    //   }
    // }

    if (inputter.isKeyPressed(Keys.space)) {
      this.playerShoot();
    }
  }

  private movePlayer(inputDirection: Coordinates) {
    const tileEntity = this.getComponent(TileEntity);
    const tileMap = tileEntity.tileMap;

    if (tileEntity.isMoving) {
      return;
    }

    const currentTilePosition = tileEntity.tilePosition;

    let destTilePosition = addVector(currentTilePosition, inputDirection);

    if (tileMap.getTile(destTilePosition) === Tile.Wall) {
      // can we continue on towards the direction we were facing instead?
      destTilePosition = addVector(currentTilePosition, this.facing);
    } else {
      this.facing = inputDirection;
    }

    if (tileMap.getTile(destTilePosition) !== Tile.Wall) {
      tileEntity.move(destTilePosition, MOVE_TIME_MS);
    }
  }

  private playerShoot() {
    const bullet = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bullet');

    bullet.getComponent(Bullet).worldObject = this.getComponent(
      TileEntity
    ).world;

    const phys = this.getComponent(Physical);
    const bulletPhys = bullet.getComponent(Physical);

    bulletPhys.center = { x: phys.center.x, y: phys.center.y };

    bulletPhys.vel = {
      x: this.facing.x * BULLET_SPEED,
      y: this.facing.y * BULLET_SPEED,
    };
  }
}
