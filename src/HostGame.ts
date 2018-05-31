import GameState, { Player } from './GameState';
import keyCodes from './util/keyCodes';
import {
  registerListeners as registerInputterListeners,
  keysDown as inputterKeysDown,
} from './util/inputter';
import RunLoop from './util/RunLoop';
import render from './render';
import * as Peer from 'simple-peer';
import * as ARSON from 'arson';
import { isColliding, getXDepth, getYDepth } from './util/collision';

interface PlayerOptions {
  color: string;
}

const MOVE_SPEED = 0.1;

let playerIdCounter = 0;

export default class HostGame {
  state: GameState;
  hostId: number;
  canvasCtx: CanvasRenderingContext2D;
  peers: Set<Peer.Instance>;

  peerToPlayerId = new Map<Peer.Instance, number>();

  constructor(peers: Set<Peer.Instance>) {
    this.state = {
      level: {},
      players: new Map(),
    };

    this.peers = peers;

    // create a host player
    this.hostId = this.addPlayer({
      color: 'red',
    });

    this.state.players.get(this.hostId)!.keysDown = inputterKeysDown;

    registerInputterListeners();

    this.canvasCtx = (document.getElementById(
      'game'
    ) as HTMLCanvasElement).getContext('2d')!;

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
  }

  sendToPeers(data: {}) {
    const serialized = JSON.stringify(data);
    for (let peer of this.peers) {
      peer.send(serialized);
    }
  }

  movePlayer(player: Player, dt: number, vec: [number, number]) {
    const xMove = vec[0] * MOVE_SPEED * dt;
    const yMove = vec[1] * MOVE_SPEED * dt;

    const players = this.state.players.values();

    // Collision code is hacked together as fuck from
    // https://gamedev.stackexchange.com/a/71123

    if (xMove !== 0) {
      player.box.center[0] += xMove;

      for (let otherPlayer of players) {
        if (player === otherPlayer) {
          continue;
        }

        if (isColliding(player.box, otherPlayer.box)) {
          const depth = getXDepth(player.box, otherPlayer.box);
          player.box.center[0] -= depth;
        }
      }
    }

    if (yMove !== 0) {
      player.box.center[1] += yMove;

      for (let otherPlayer of players) {
        if (player === otherPlayer) {
          continue;
        }

        if (isColliding(player.box, otherPlayer.box)) {
          const depth = getYDepth(player.box, otherPlayer.box);
          player.box.center[1] -= depth;
        }
      }
    }
  }

  update(dt: number) {
    for (let player of this.state.players.values()) {
      const vec: [number, number] = [0, 0];
      if (player.keysDown.has(keyCodes.RIGHT_ARROW)) {
        vec[0] = 1;
      } else if (player.keysDown.has(keyCodes.LEFT_ARROW)) {
        vec[0] = -1;
      } else if (player.keysDown.has(keyCodes.UP_ARROW)) {
        vec[1] = -1;
      } else if (player.keysDown.has(keyCodes.DOWN_ARROW)) {
        vec[1] = 1;
      }
      this.movePlayer(player, dt, vec);
    }

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
    this.state.players.get(playerId)!.keysDown.add(keyCode);
  }

  onClientKeyUp(playerId: number, keyCode: number) {
    this.state.players.get(playerId)!.keysDown.delete(keyCode);
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
      keysDown: new Set(),
    });

    return playerIdCounter;
  }
}
