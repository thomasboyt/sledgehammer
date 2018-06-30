import {
  Component,
  Physical,
  Keys,
  Coordinates,
  PolygonCollider,
  AnimationManager,
  Sprite,
} from 'pearl';
import Game from './Game';
import NetworkingHost from './networking/NetworkingHost';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import Bullet from './Bullet';
import { addVector } from '../util/math';
import createCachedRender from '../../src/util/createCachedRender';
import { WIDTH, HEIGHT } from '../constants';
import NetworkingClient from './networking/NetworkingClient';
import Networking from './networking/Networking';
import SpawnRenderer from './SpawnRenderer';

const MOVE_TIME_MS = 120;
const BULLET_SPEED = 0.2;

type PlayerState = 'spawning' | 'alive' | 'dead';

export interface Options {
  playerId: number;
}

export default class Player extends Component<Options> {
  facing: Coordinates = { x: 1, y: 0 };
  playerState = 'spawning';

  color?: [number, number, number];
  playerId?: number;

  init() {
    if (this.playerId === undefined) {
      throw new Error('no playerId set on player');
    }

    if (!this.color) {
      throw new Error('missing color on player');
    }

    this.getComponent(AnimationManager).mask([0, 0, 0], this.color);

    this.getComponent(SpawnRenderer).onFinish.add(() => {
      this.playerState = 'alive';
    });
  }

  die() {
    this.playerState = 'dead';
    this.getComponent(TileEntity).cancelMove();
    this.getComponent(AnimationManager).isVisible = false;
  }

  setFacing(coordinates: Coordinates) {
    this.facing = coordinates;

    let angle = Math.atan(this.facing.y / this.facing.x);

    // mirror the X direction if we're going left
    if (this.facing.x < 0) {
      this.getComponent(AnimationManager).setScale(-1, 1);
    } else {
      this.getComponent(AnimationManager).setScale(1, 1);
    }

    this.getComponent(Physical).angle = angle;
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    if (this.playerState !== 'alive') {
      return;
    }

    const players = this.pearl.obj.getComponent(NetworkingHost).players;
    const networkedPlayer = players.get(this.playerId!)!;
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
      this.getComponent(AnimationManager).set('walking');
      this.movePlayer(inputDirection);
    } else {
      this.getComponent(AnimationManager).set('idle');
    }

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
      this.setFacing(inputDirection);
    }

    if (tileMap.getTile(destTilePosition) !== Tile.Wall) {
      tileEntity.move(destTilePosition, MOVE_TIME_MS);
    }
  }

  private playerShoot() {
    const bullet = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bullet');

    const phys = this.getComponent(Physical);
    const collider = this.getComponent(PolygonCollider);
    const bulletPhys = bullet.getComponent(Physical);
    const bulletCollider = bullet.getComponent(PolygonCollider);

    // spawn bullet directly in front of where player's facing, offset so that it's in front of
    // player + padding so there's no intersecting
    // (padding is kinda arbitrary and may need to be shifted if velocities of players or bullets
    // are changed since it's possible for a player to "catch up" if they shoot in direction they
    // are moving)
    bulletPhys.center = {
      x:
        phys.center.x +
        this.facing.x * (collider.width! / 2 + bulletCollider.width! / 2 + 3),
      y:
        phys.center.y +
        this.facing.y * (collider.height! / 2 + bulletCollider.height! / 2 + 3),
    };

    bulletPhys.vel = {
      x: this.facing.x * BULLET_SPEED,
      y: this.facing.y * BULLET_SPEED,
    };
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.playerState === 'dead') {
      const phys = this.getComponent(Physical);
      const collider = this.getComponent(PolygonCollider);
      const width = collider.width!;
      const height = collider.height!;

      ctx.strokeStyle = `rgb(${this.color!.join(',')})`;
      ctx.translate(phys.center.x, phys.center.y);

      // draw an x
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-width / 2 + 3, -height / 2 + 3);
      ctx.lineTo(width / 2 - 3, height / 2 - 3);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-width / 2 + 3, height / 2 - 3);
      ctx.lineTo(width / 2 - 3, -height / 2 + 3);
      ctx.closePath();
      ctx.stroke();
    }
  }
}
