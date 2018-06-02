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

import GameState, { Player, Tile } from './GameState';
import render from './render';
import { TILE_SIZE, WIDTH, HEIGHT } from './constants';
import { getVectorComponents } from './util/math';

interface PlayerOptions {
  color: string;
}

const MOVE_SPEED = 0.1;
const BULLET_SPEED = 0.2;

let playerIdCounter = 0;

const tilesString = `
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
x                              x
x                              x
x                              x
x       x  x   xxx             x
x       x  x    x              x
x       xxxx    x              x
x       x  x    x              x
x       x  x   xxx             x
x                              x
x                              x
x                              x
x                              x
x                              x
x      xxxxxx                  x
x                              x
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

interface CollisionEntity {
  box: BoundingBox;
}

function tilesToCollisionEntities(tiles: Tile[][]): CollisionEntity[] {
  const collisionEntities: CollisionEntity[] = [];

  for (let y = 0; y < tiles.length; y += 1) {
    const tileRow = tiles[y];
    for (let x = 0; x < tileRow.length; x += 1) {
      const tile = tileRow[x];
      if (tile === 'wall') {
        collisionEntities.push({
          box: {
            center: [
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
            ],
            width: TILE_SIZE,
            height: TILE_SIZE,
          },
        });
      }
    }
  }

  return collisionEntities;
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

    this.canvasCtx = (document.getElementById(
      'game'
    ) as HTMLCanvasElement).getContext('2d')!;

    const hostInputter = new PlayerInputter();
    hostInputter.registerLocalListeners();
    this.playerInputters.set(this.hostId, hostInputter);

    const loop = new RunLoop();
    loop.onTick(this.update.bind(this));
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

  movePlayer(player: Player, dt: number, vec: [number, number]) {
    const xMove = vec[0] * MOVE_SPEED * dt;
    const yMove = vec[1] * MOVE_SPEED * dt;

    const players = this.state.players.values();
    // TODO: cache the fuck outta this
    const tiles = tilesToCollisionEntities(this.state.level.tiles);

    const collisionEntities = [...players, ...tiles];

    // Collision code is hacked together as fuck from
    // https://gamedev.stackexchange.com/a/71123

    if (xMove !== 0) {
      player.box.center[0] += xMove;

      for (let other of collisionEntities) {
        if (player === other) {
          continue;
        }

        if (isColliding(player.box, other.box)) {
          const depth = getXDepth(player.box, other.box);
          player.box.center[0] -= depth;
        }
      }
    }

    if (yMove !== 0) {
      player.box.center[1] += yMove;

      for (let other of collisionEntities) {
        if (player === other) {
          continue;
        }

        if (isColliding(player.box, other.box)) {
          const depth = getYDepth(player.box, other.box);
          player.box.center[1] -= depth;
        }
      }
    }

    player.vec = vec;

    if (vec[0] !== 0 || vec[1] !== 0) {
      let angle = Math.atan(player.vec[1] / player.vec[0]);
      if (player.vec[0] < 0) {
        angle += Math.PI;
      }

      player.angle = angle;
    }
  }

  playerShoot(player: Player) {
    this.state.bullets.push({
      // todo: spawn from edge of player instead of center
      box: {
        center: [player.box.center[0], player.box.center[1]],
        width: 10,
        height: 6,
      },
      angle: player.angle,
    });
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

      this.movePlayer(player, dt, vec);

      const keysPressed = inputter.getKeysPressedAndClear();
      if (keysPressed.has(keyCodes.SPACE)) {
        this.playerShoot(player);
      }
    }

    for (let bullet of this.state.bullets) {
      // update with angle + velocity i guess
      const vec = getVectorComponents(BULLET_SPEED * dt, bullet.angle);
      bullet.box.center[0] += vec[0];
      bullet.box.center[1] += vec[1];
    }

    this.state.bullets = this.state.bullets.filter((bullet) => {
      // clean up off screen bullets
      // (this shouldn't need to happen once collision detection is in obviously)
      const x = bullet.box.center[0];
      const y = bullet.box.center[1];
      const w = bullet.box.width;
      const h = bullet.box.height;

      return !(x + w < 0 || x - w > WIDTH || y + h < 0 || y - h > HEIGHT);
    });

    this.sendSnapshot();

    render(this.canvasCtx, this.state);
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
      color: opts.color,
      box: {
        center: [50, playerIdCounter * 50],
        width: 20,
        height: 20,
      },
      vec: [0, 0],
      angle: 0,
    });

    this.playerInputters.set(playerIdCounter, new PlayerInputter());

    return playerIdCounter;
  }

  removePlayer(playerId: number) {
    this.state.players.delete(playerId);
    this.playerInputters.delete(playerId);
  }
}
