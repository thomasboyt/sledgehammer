import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

import {
  TILE_SIZE,
  WIDTH,
  HEIGHT,
  WORLD_SIZE_HEIGHT,
  WORLD_SIZE_WIDTH,
} from './constants';

import keyCodes from './util/keyCodes';
import PlayerInputter from './util/PlayerInputter';
import RunLoop from './util/RunLoop';
import { isColliding, BoundingBox } from './util/collision';
import { lerp2, add2, Vec2, randomChoice, getRandomInt } from './util/math';
import TimerManager from './util/TimerManager';

import { setupCanvas } from './setupCanvas';
import {
  getTile,
  wrapTileCoordinates,
  centerToTile,
  tileToCenter,
  tilesToCollisionEntities,
  forEachTile,
} from './tileMap';

import { levelTiles, getTilesFromString } from './levels';
import GameState, { Player, Enemy } from './GameState';

import render from './render';

const MAX_FRAME_MS = 50;
const BULLET_SPEED = 0.2;

interface PlayerOptions {
  color: string;
}

export default class HostGame {
  state: GameState;
  hostId: number;
  canvasCtx: CanvasRenderingContext2D;
  playerInputters = new Map<number, PlayerInputter>();
  timerManager: TimerManager = new TimerManager();
  wallEntities: BoundingBox[] = [];

  playerIdCounter = 0;
  peerToPlayerId = new Map<Peer.Instance, number>();
  lastPingTime: number = Date.now();

  constructor() {
    const tiles = getTilesFromString(levelTiles);

    this.state = {
      level: {
        tiles,
      },
      players: new Map(),
      bullets: new Set(),
      enemies: new Set(),
    };

    this.wallEntities = tilesToCollisionEntities(tiles);

    // spawn enemies at random places
    forEachTile(tiles, ([x, y], tile) => {
      if (tile !== 'wall') {
        if (getRandomInt(0, 30) <= 1) {
          const choices: Vec2[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          const facing = randomChoice(choices);

          this.state.enemies.add({
            type: 'enemy',
            center: tileToCenter([x, y]),
            width: TILE_SIZE,
            height: TILE_SIZE,
            facing,
            isMoving: false,
          });
        }
      }
    });

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

    setInterval(() => {
      this.lastPingTime = Date.now();
      this.sendToPeers({
        type: 'ping',
      });
    }, 2000);
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
      } else if (msg.type === 'pong') {
        const ping = Date.now() - this.lastPingTime;
        this.state.players.get(playerId)!.ping = ping;
      }
    });

    peer.on('close', () => {
      this.peerToPlayerId.delete(peer);
      this.removePlayer(playerId);
    });
  }

  private onClientKeyDown(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.handleKeyDown(keyCode);
  }

  private onClientKeyUp(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.handleKeyUp(keyCode);
  }

  private addPlayer(opts: PlayerOptions): number {
    const playerId = this.playerIdCounter;
    this.playerIdCounter += 1;

    this.state.players.set(playerId, {
      type: 'player',

      // center: [TILE_SIZE * 2 - TILE_SIZE / 2, playerIdCounter * 50],
      center: [24, 24],
      width: TILE_SIZE,
      height: TILE_SIZE,

      color: opts.color,
      vec: [0, 0],
      facing: [1, 0],
      isMoving: false,
    });

    this.playerInputters.set(playerId, new PlayerInputter());

    return playerId;
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
    this.sendToPeers({
      type: 'snapshot',
      data: serialized,
    });
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

  private update(dt: number): void {
    this.timerManager.update(dt);

    for (let playerId of this.state.players.keys()) {
      this.updatePlayer(dt, playerId);
    }

    this.updateEnemies();

    this.updateBullets(dt);
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

    this.movePlayer(playerId, inputDirection);

    const keysPressed = inputter.getKeysPressedAndClear();
    if (keysPressed.has(keyCodes.SPACE)) {
      this.playerShoot(player);
    }
  }

  private movePlayer(playerId: number, inputDirection: Vec2 | null): void {
    const player = this.state.players.get(playerId)!;
    const tiles = this.state.level.tiles;

    // https://www.reddit.com/r/gamedev/comments/4aa5nd/smooth_tile_based_movement_pacman/
    if (inputDirection && !player.isMoving) {
      player.vec = inputDirection;

      const playerTile = centerToTile(player.center);

      let destTile = add2(playerTile, inputDirection);

      if (getTile(tiles, destTile) === 'wall') {
        // can we continue on towards the direction we were facing instead?
        destTile = add2(playerTile, player.facing);
      } else {
        player.facing = inputDirection;
      }

      if (getTile(tiles, destTile) !== 'wall') {
        this.moveGridEntity(player, playerTile, destTile, 120);
      }
    }
  }

  private playerShoot(player: Player): void {
    const vec: Vec2 = [
      player.facing[0] * BULLET_SPEED,
      player.facing[1] * BULLET_SPEED,
    ];

    this.state.bullets.add({
      type: 'bullet',
      // todo: spawn from edge of player instead of center
      center: [player.center[0], player.center[1]],
      width: 6,
      height: 6,
      vec,
    });
  }

  private updateEnemies(): void {
    for (let enemy of this.state.enemies) {
      if (!enemy.isMoving) {
        const tiles = this.state.level.tiles;

        const currentTilePos = centerToTile(enemy.center);

        const forwardPos = add2(currentTilePos, enemy.facing);
        const ccwPos = add2(currentTilePos, [
          enemy.facing[1],
          -enemy.facing[0],
        ]);
        const cwPos = add2(currentTilePos, [-enemy.facing[1], enemy.facing[0]]);

        let nextTilePos: Vec2;

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

        if (getTile(tiles, forwardPos) !== 'wall') {
          if (getRandomInt(0, 5) === 0) {
            const candidates = [ccwPos, cwPos].filter((pos) => {
              return getTile(tiles, pos) !== 'wall';
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
            return getTile(tiles, pos) !== 'wall';
          });

          if (candidates.length === 0) {
            nextTilePos = add2(currentTilePos, [
              -enemy.facing[0],
              -enemy.facing[1],
            ]);
          } else {
            nextTilePos = randomChoice(candidates);
          }
        }

        enemy.facing = [
          nextTilePos[0] - currentTilePos[0],
          nextTilePos[1] - currentTilePos[1],
        ];

        this.moveGridEntity(enemy, currentTilePos, nextTilePos, 240);
      }
    }
  }

  /**
   * move a grid-aligned entity from a specific tile, to another tile, over `ms` amount of time
   * also handle wrapping around edges of the world
   */
  private moveGridEntity(
    entity: Player | Enemy,
    fromTile: Vec2,
    destTile: Vec2,
    ms: number
  ): void {
    const wrappedDestTile = wrapTileCoordinates(destTile);

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
      timerMs: ms,
      update: (elapsedMs: number, timerMs: number) => {
        const f = elapsedMs / timerMs;
        entity.center = lerp2(fromPoint, toPoint, f);

        if (f === 1) {
          entity.isMoving = false;
        }
      },
    });

    entity.isMoving = true;
  }

  private updateBullets(dt: number): void {
    for (let bullet of this.state.bullets) {
      bullet.center = add2(bullet.center, [
        bullet.vec[0] * dt,
        bullet.vec[1] * dt,
      ]);

      // clean up off screen bullets
      // (this shouldn't need to happen once wraparound is implemented
      const x = bullet.center[0];
      const y = bullet.center[1];
      const w = bullet.width;
      const h = bullet.height;

      if (x + w < 0 || x - w > WIDTH || y + h < 0 || y - h > HEIGHT) {
        this.state.bullets.delete(bullet);
        continue;
      }

      for (let wall of this.wallEntities) {
        if (isColliding(bullet, wall)) {
          this.state.bullets.delete(bullet);
          continue;
        }
      }

      for (let enemy of this.state.enemies) {
        if (isColliding(bullet, enemy)) {
          this.state.enemies.delete(enemy);
          this.state.bullets.delete(bullet);
          // TODO: particle explosion goes here? unless it's in the render logic...
          continue;
        }
      }
    }
  }
}
