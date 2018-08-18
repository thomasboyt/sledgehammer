import {
  Component,
  Physical,
  Keys,
  Coordinates,
  AnimationManager,
  Sprite,
  SpriteRenderer,
  Entity,
  CollisionInformation,
  BoxCollider,
  Vector2,
} from 'pearl';
import Game from './Game';
import {
  NetworkingHost,
  NetworkedEntity,
  NetworkedComponent,
} from 'pearl-networking';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import Bullet from './Bullet';
import { addVector } from '../util/math';
import SpawningDyingRenderer from './SpawningDyingRenderer';
import { DEBUG_GOD_MODE } from '../constants';
import Session from './Session';
import World from './World';
import BaseEnemy from './enemies/BaseEnemy';

const MOVE_TIME_MS = 120;
const PLAYER_BULLET_SPEED = 0.2;

type PlayerState = 'spawning' | 'alive' | 'dead';

interface Snapshot {
  worldId: string;
  playerState: string;
  playerId?: string;
  color: [number, number, number];
  facing: Vector2;
}

export interface Options {
  playerId: number;
}

export default class Player extends Component<Options>
  implements NetworkedComponent<Snapshot> {
  facing: Coordinates = { x: 1, y: 0 };
  playerState = 'spawning';

  color?: [number, number, number];
  playerId?: string;

  init() {
    if (this.playerId === undefined) {
      throw new Error('no playerId set on player');
    }

    if (!this.color) {
      throw new Error('missing color on player');
    }

    this.getComponent(SpriteRenderer).mask([0, 0, 0], this.color);

    this.getComponent(BoxCollider).isEnabled = false;
    this.getComponent(SpawningDyingRenderer).spawn(() => {
      this.getComponent(BoxCollider).isEnabled = true;
      this.playerState = 'alive';
    });
  }

  die() {
    if (DEBUG_GOD_MODE) {
      return;
    }

    this.playerState = 'dead';
    this.getComponent(BoxCollider).isEnabled = false;
    this.getComponent(TileEntity).cancelMove();
    this.rpcDie();
  }

  rpcDie() {
    this.getComponent(SpawningDyingRenderer).die();
  }

  setFacing(coordinates: Coordinates) {
    this.facing = coordinates;

    let angle = Math.atan(this.facing.y / this.facing.x);

    // mirror the X direction if we're going left
    if (this.facing.x < 0) {
      this.getComponent(SpriteRenderer).scaleX = -1;
    } else {
      this.getComponent(SpriteRenderer).scaleX = 1;
    }

    this.getComponent(Physical).angle = angle;
  }

  update(dt: number) {
    if (!this.pearl.root.getComponent(Game).isHost) {
      return;
    }

    const session = this.pearl.entities
      .all('session')[0]!
      .getComponent(Session);

    if (this.playerState !== 'alive' || session.gameState !== 'playing') {
      return;
    }

    const players = this.pearl.root.getComponent(NetworkingHost).players;
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
    const bullet = this.pearl.root
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bullet');

    this.entity.parent!.appendChild(bullet);

    bullet.getComponent(Bullet).shoot({
      originObject: this.entity,
      facing: this.facing,
      speed: PLAYER_BULLET_SPEED,
    });
  }

  onCollision(collision: CollisionInformation) {
    if (this.playerState !== 'alive') {
      return;
    }

    if (collision.entity.hasTag('bullet')) {
      this.die();
    } else if (collision.entity.hasTag('enemy')) {
      if (collision.entity.getComponent(BaseEnemy).state === 'alive') {
        this.die();
      }
    } else if (collision.entity.hasTag('pickup')) {
      this.entity
        .parent!.getComponent(World)
        .playerCollectedPickup(this.entity, collision.entity);
    }
  }

  serialize(): Snapshot {
    const tileEntity = this.getComponent(TileEntity);
    const worldId = tileEntity.tileMap.entity.getComponent(NetworkedEntity)
      .id;

    return {
      worldId,
      playerState: this.playerState,
      playerId: this.playerId,
      color: this.color!,
      facing: this.facing,
    };
  }

  deserialize(snapshot: Snapshot, entitiesById: Map<string, Entity>) {
    const world = entitiesById.get(snapshot.worldId);

    if (!world) {
      throw new Error('missing world object');
    }

    const tileEntity = this.getComponent(TileEntity);
    tileEntity.world = world;

    this.playerState = snapshot.playerState;
    this.playerId = snapshot.playerId;
    this.color = snapshot.color;
    this.setFacing(snapshot.facing);
  }
}
