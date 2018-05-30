import GameState from './GameState';
import keyCodes from './util/keyCodes';
import {
  registerListeners as registerInputterListeners,
  keysDown as inputterKeysDown,
} from './util/inputter';
import RunLoop from './util/RunLoop';
import render from './render';

interface PlayerOptions {
  color: string;
}

const MOVE_SPEED = 0.1;

let playerIdCounter = 0;

export default class HostGame {
  state: GameState;
  hostId: number;
  canvasCtx: CanvasRenderingContext2D;

  constructor() {
    this.state = {
      level: {},
      players: new Map(),
    };

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

  update(dt: number) {
    // todo idk
    // probably move players
    for (let player of this.state.players.values()) {
      if (player.keysDown.has(keyCodes.RIGHT_ARROW)) {
        player.pos[0] += dt * MOVE_SPEED;
      }
    }

    render(this.canvasCtx, this.state);
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
