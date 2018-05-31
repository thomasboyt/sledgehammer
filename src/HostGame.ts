import GameState from './GameState';
import keyCodes from './util/keyCodes';
import {
  registerListeners as registerInputterListeners,
  keysDown as inputterKeysDown,
} from './util/inputter';
import RunLoop from './util/RunLoop';
import render from './render';
import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

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

  sendToPeers(data: {}) {
    const serialized = JSON.stringify(data);
    for (let peer of this.peers) {
      peer.send(serialized);
    }
  }

  update(dt: number) {
    for (let player of this.state.players.values()) {
      if (player.keysDown.has(keyCodes.RIGHT_ARROW)) {
        player.pos[0] += dt * MOVE_SPEED;
      } else if (player.keysDown.has(keyCodes.LEFT_ARROW)) {
        player.pos[0] -= dt * MOVE_SPEED;
      } else if (player.keysDown.has(keyCodes.UP_ARROW)) {
        player.pos[1] -= dt * MOVE_SPEED;
      } else if (player.keysDown.has(keyCodes.DOWN_ARROW)) {
        player.pos[1] += dt * MOVE_SPEED;
      }
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
      pos: [0, 0],
      keysDown: new Set(),
    });

    return playerIdCounter;
  }
}
