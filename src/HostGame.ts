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
import { TILE_SIZE, WIDTH, HEIGHT } from './constants';
import { getVectorComponents } from './util/math';
import { isDeepStrictEqual } from 'util';
import { setupCanvas } from './setupCanvas';

interface PlayerOptions {
  color: string;
}

const MAX_FRAME_MS = 50;
const MOVE_SPEED = 0.1;
const BULLET_SPEED = 0.2;

let playerIdCounter = 0;

const tilesString = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
x                              x
x                              x
x                              x
x            x x xxx           x
x            x x  x            x
x            xxx  x            x
x            x x  x            x
x            x x xxx           x
x                              x
x                              x
x      xxx x x xxx xxx xxx     x
x       x  x x x   x x x       x
x       x  xxx xxx xx  xxx     x
x       x  x x x   x x x       x
x       x  x x xxx x x xxx     x
x                              x
x                              x
x                              x
x                              x
x                              x
x                              x
x                              x
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
`;

const charToTile: { [char: string]: Tile } = {
  x: 'wall',
  ' ': null,
};

function getTilesFromString(str: string): Tile[][] {
  const tiles: Tile[][] = [];
  const lines = str.trim().split('\n');

  for (let y = 0; y < lines.length; y += 1) {
    tiles[y] = [];
    for (let x = 0; x < lines[y].length; x += 1) {
      const tile = charToTile[lines[y][x]];
      tiles[y][x] = tile;
    }
  }

  return tiles;
}

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
  const entities = [...state.players.values(), ...state.bullets];
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

  peerToPlayerId = new Map<Peer.Instance, number>();

  constructor() {
    const tiles = getTilesFromString(tilesString);

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

  onPeerConnected(peer: Peer.Instance) {
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

  sendToPeers(data: {}) {
    const serialized = JSON.stringify(data);
    for (let peer of this.peerToPlayerId.keys()) {
      peer.send(serialized);
    }
  }

  playerShoot(player: Player) {
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

  onTick(dt: number) {
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

  update(dt: number) {
    for (let [playerId, player] of this.state.players.entries()) {
      const inputter = this.playerInputters.get(playerId)!;

      let vec: [number, number] = [0, 0];

      if (inputter.keysDown.has(keyCodes.RIGHT_ARROW)) {
        vec[0] += 1;
      }
      if (inputter.keysDown.has(keyCodes.LEFT_ARROW)) {
        vec[0] -= 1;
      }
      if (inputter.keysDown.has(keyCodes.UP_ARROW)) {
        vec[1] -= 1;
      }
      if (inputter.keysDown.has(keyCodes.DOWN_ARROW)) {
        vec[1] += 1;
      }

      if (vec[0] !== 0 || vec[1] !== 0) {
        let angle = Math.atan(player.vec[1] / player.vec[0]);
        if (player.vec[0] < 0) {
          angle += Math.PI;
        }

        player.angle = angle;
      }

      player.vec = [vec[0] * MOVE_SPEED, vec[1] * MOVE_SPEED];

      const keysPressed = inputter.getKeysPressedAndClear();
      if (keysPressed.has(keyCodes.SPACE)) {
        this.playerShoot(player);
      }
    }

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

  sendSnapshot() {
    /*
     * TODO: state currently contains shit i ain't wanna serialize
     */
    const serialized = ARSON.encode(this.state);
    this.sendToPeers(serialized);
  }

  // TODO: move this elsewhere maybe idk
  onClientKeyDown(playerId: number, keyCode: number) {
    this.playerInputters.get(playerId)!.onKeyDown(keyCode);
  }

  onClientKeyUp(playerId: number, keyCode: number) {
    this.playerInputters.get(playerId)!.onKeyUp(keyCode);
  }

  addPlayer(opts: PlayerOptions) {
    playerIdCounter += 1;

    this.state.players.set(playerIdCounter, {
      type: 'player',

      center: [50, playerIdCounter * 50],
      width: 18,
      height: 18,
      angle: 0,

      color: opts.color,
      vec: [0, 0],
    });

    this.playerInputters.set(playerIdCounter, new PlayerInputter());

    return playerIdCounter;
  }

  removePlayer(playerId: number) {
    this.state.players.delete(playerId);
    this.playerInputters.delete(playerId);
  }
}
