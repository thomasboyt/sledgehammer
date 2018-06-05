import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

import keyCodes from './util/keyCodes';
import PlayerInputter from './util/PlayerInputter';
import RunLoop from './util/RunLoop';
import {
  isColliding,
  getXDepth,
  getYDepth,
  getCollisionPairs,
  BoundingBox,
} from './util/collision';

import GameState, { Player, Tile, Entity } from './GameState';
import render from './render';
import {
  TILE_SIZE,
  WIDTH,
  HEIGHT,
  WORLD_SIZE_HEIGHT,
  WORLD_SIZE_WIDTH,
} from './constants';
import { getVectorComponents, lerp2, add2, Vec2 } from './util/math';
import { isDeepStrictEqual } from 'util';
import { setupCanvas } from './setupCanvas';
import { levelTiles, getTilesFromString } from './levels';
import TimerManager from './util/TimerManager';
import {
  getTile,
  wrapTileCoordinates,
  centerToTile,
  tileToCenter,
} from './tileMap';

interface PlayerOptions {
  color: string;
}

const MAX_FRAME_MS = 50;
const MOVE_SPEED = 0.1;
const BULLET_SPEED = 0.2;

let playerIdCounter = 0;

function tilesToCollisionEntities(tiles: Tile[][]): Entity[] {
  const collisionEntities: Entity[] = [];

  for (let y = 0; y < tiles.length; y += 1) {
    const tileRow = tiles[y];
    for (let x = 0; x < tileRow.length; x += 1) {
      const tile = tileRow[x];
      if (tile === 'wall') {
        collisionEntities.push({
          type: 'wall',
          center: [
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
          ],
          width: TILE_SIZE,
          height: TILE_SIZE,
        });
      }
    }
  }

  return collisionEntities;
}

function handleCollision(state: GameState, entity: Entity, other: Entity) {
  if (entity.type === 'bullet' && other.type === 'wall') {
    state.bullets = state.bullets.filter((bullet) => entity !== bullet);
  }
}

function shouldResolveCollision(entity: Entity, other: Entity): boolean {
  return (
    entity.type === 'player' &&
    (other.type === 'wall' || other.type === 'player')
  );
}

function moveEntitiesAndResolveCollisions(state: GameState, dt: number) {
  // TODO: cache the fuck outta this
  const tileEntities = tilesToCollisionEntities(state.level.tiles);
  const entities = [...state.bullets];
  const collisionTargets = [...entities, ...tileEntities];

  for (let entity of entities) {
    const vec: [number, number] = [entity.vec[0] * dt, entity.vec[1] * dt];

    const collidedEntities = new Set<Entity>();

    // TODO: need to make sure this is prioritized correctly
    //
    // e.g. if player B collides with another, stationary player A, player *B* should get moved back
    // but if player A comes first in the iteration order, it would be moved back, without a logic
    // check
    // ALSO if two players move towards each other at same speed, if this is done in "order" then one will be pushed back while the other moves into them!

    entity.center[0] += vec[0];

    for (let other of collisionTargets) {
      if (entity === other) {
        continue;
      }

      if (isColliding(entity, other)) {
        if (shouldResolveCollision(entity, other)) {
          const xDepth = getXDepth(entity, other);
          entity.center[0] -= xDepth;
        }
        collidedEntities.add(other);
      }
    }

    entity.center[1] += vec[1];

    for (let other of collisionTargets) {
      if (entity === other) {
        continue;
      }

      if (isColliding(entity, other)) {
        if (shouldResolveCollision(entity, other)) {
          const yDepth = getYDepth(entity, other);
          entity.center[1] -= yDepth;
        }
        collidedEntities.add(other);
      }
    }

    for (let other of collidedEntities) {
      // TODO: pass some information about the collision intersection here?
      // (example use case: reflective bullet)
      handleCollision(state, entity, other);
    }
  }
}

export default class HostGame {
  state: GameState;
  hostId: number;
  canvasCtx: CanvasRenderingContext2D;
  playerInputters = new Map<number, PlayerInputter>();
  timerManager: TimerManager = new TimerManager();

  peerToPlayerId = new Map<Peer.Instance, number>();

  constructor() {
    const tiles = getTilesFromString(levelTiles);

    this.state = {
      level: {
        tiles,
      },
      players: new Map(),
      bullets: [],
    };

    // create a host player
    this.hostId = this.addPlayer({
      color: 'red',
    });

    const canvas = setupCanvas('#game');
    this.canvasCtx = canvas.getContext('2d')!;

    const hostInputter = new PlayerInputter();
    hostInputter.registerLocalListeners();
    this.playerInputters.set(this.hostId, hostInputter);

    const loop = new RunLoop();
    loop.onTick(this.onTick.bind(this));
    loop.start();
  }

  /*
   * External event handlers
   */

  onPeerConnected(peer: Peer.Instance): void {
    const playerId = this.addPlayer({
      color: 'cyan',
    });

    this.peerToPlayerId.set(peer, playerId);

    peer.on('data', (data: string) => {
      const msg = JSON.parse(data);

      if (msg.type === 'keyDown') {
        this.onClientKeyDown(playerId, msg.data.keyCode);
      } else if (msg.type === 'keyUp') {
        this.onClientKeyUp(playerId, msg.data.keyCode);
      }
    });

    peer.on('close', () => {
      this.peerToPlayerId.delete(peer);
      this.removePlayer(playerId);
    });
  }

  private onClientKeyDown(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.onKeyDown(keyCode);
  }

  private onClientKeyUp(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.onKeyUp(keyCode);
  }

  private addPlayer(opts: PlayerOptions): number {
    playerIdCounter += 1;

    this.state.players.set(playerIdCounter, {
      type: 'player',

      // center: [TILE_SIZE * 2 - TILE_SIZE / 2, playerIdCounter * 50],
      center: [24, 24],
      width: TILE_SIZE,
      height: TILE_SIZE,
      angle: 0,

      color: opts.color,
      vec: [0, 0],
      facing: [1, 0],
      isMoving: false,
    });

    this.playerInputters.set(playerIdCounter, new PlayerInputter());

    return playerIdCounter;
  }

  private removePlayer(playerId: number): void {
    this.state.players.delete(playerId);
    this.playerInputters.delete(playerId);
  }

  /*
   * External communication
   */

  private sendToPeers(data: {}): void {
    const serialized = JSON.stringify(data);
    for (let peer of this.peerToPlayerId.keys()) {
      peer.send(serialized);
    }
  }

  private sendSnapshot(): void {
    /*
     * TODO: state currently contains shit i ain't wanna serialize
     */
    const serialized = ARSON.encode(this.state);
    this.sendToPeers(serialized);
  }

  /*
   * Update loop
   */

  private onTick(dt: number): void {
    if (dt > MAX_FRAME_MS) {
      const maxFrames = Math.floor(dt / MAX_FRAME_MS);
      for (let i = 0; i < maxFrames; i += 1) {
        this.update(MAX_FRAME_MS);
      }

      const leftoverFrameDt = dt % MAX_FRAME_MS;
      this.update(leftoverFrameDt);
    } else {
      this.update(dt);
    }

    this.sendSnapshot();
    render(this.canvasCtx, this.state);
  }

  update(dt: number): void {
    this.timerManager.update(dt);

    for (let [playerId, player] of this.state.players.entries()) {
      this.updatePlayer(dt, playerId);
    }

    // for (let enemy of this.state.enemies) {
    //   // do path finding to player i guess idk
    // }

    this.state.bullets = this.state.bullets.filter((bullet) => {
      // clean up off screen bullets
      // (this shouldn't need to happen once collision detection is in obviously)
      const x = bullet.center[0];
      const y = bullet.center[1];
      const w = bullet.width;
      const h = bullet.height;

      if (x + w < 0 || x - w > WIDTH || y + h < 0 || y - h > HEIGHT) {
        return false;
      }

      return true;
    });

    moveEntitiesAndResolveCollisions(this.state, dt);
  }

  private updatePlayer(dt: number, playerId: number): void {
    const inputter = this.playerInputters.get(playerId)!;
    const player = this.state.players.get(playerId)!;

    let inputDirection: [number, number] | null = null;

    if (inputter.keysDown.has(keyCodes.RIGHT_ARROW)) {
      inputDirection = [1, 0];
    } else if (inputter.keysDown.has(keyCodes.LEFT_ARROW)) {
      inputDirection = [-1, 0];
    } else if (inputter.keysDown.has(keyCodes.UP_ARROW)) {
      inputDirection = [0, -1];
    } else if (inputter.keysDown.has(keyCodes.DOWN_ARROW)) {
      inputDirection = [0, 1];
    }

    this.movePlayer(dt, playerId, inputDirection);

    let angle = Math.atan(player.facing[1] / player.facing[0]);
    if (player.facing[0] < 0) {
      angle += Math.PI;
    }

    player.angle = angle;

    const keysPressed = inputter.getKeysPressedAndClear();
    if (keysPressed.has(keyCodes.SPACE)) {
      this.playerShoot(player);
    }
  }

  private movePlayer(
    dt: number,
    playerId: number,
    inputDirection: Vec2 | null
  ): void {
    const player = this.state.players.get(playerId)!;
    const tiles = this.state.level.tiles;

    // https://www.reddit.com/r/gamedev/comments/4aa5nd/smooth_tile_based_movement_pacman/
    if (inputDirection && !player.isMoving) {
      player.vec = inputDirection;

      const playerTile = centerToTile(player.center);

      let destTile = add2(playerTile, inputDirection);

      if (getTile(tiles, destTile[0], destTile[1]) === 'wall') {
        // can we continue on towards the direction we were facing instead?
        destTile = add2(playerTile, player.facing);
      } else {
        player.facing = inputDirection;
      }

      if (getTile(tiles, destTile[0], destTile[1]) !== 'wall') {
        const wrappedDestTile = wrapTileCoordinates(destTile);

        let fromTile = playerTile;

        // TODO: with this wrapping strategy, we can't handle collisions on the side of the
        // screen we just left
        // this might be okay idk
        if (wrappedDestTile[0] !== destTile[0]) {
          if (wrappedDestTile[0] === 0) {
            fromTile[0] = -1;
          } else {
            fromTile[0] = WORLD_SIZE_WIDTH;
          }
        } else if (wrappedDestTile[1] !== destTile[1]) {
          if (wrappedDestTile[1] === 0) {
            fromTile[1] = -1;
          } else {
            fromTile[1] = WORLD_SIZE_HEIGHT;
          }
        }

        const fromPoint = tileToCenter(fromTile);
        const toPoint = tileToCenter(wrappedDestTile);

        this.timerManager.create({
          elapsedMs: 0,
          timerMs: 120,
          update: (elapsedMs: number, timerMs: number) => {
            const f = elapsedMs / timerMs;
            player.center = lerp2(fromPoint, toPoint, f);

            if (f === 1) {
              player.isMoving = false;
            }
          },
        });

        player.isMoving = true;
      }
    }
  }

  private playerShoot(player: Player): void {
    const vec = getVectorComponents(BULLET_SPEED, player.angle);

    this.state.bullets.push({
      type: 'bullet',
      // todo: spawn from edge of player instead of center
      center: [player.center[0], player.center[1]],
      width: 6,
      height: 6,
      angle: player.angle,
      vec,
    });
  }
}
