import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

import keyCodes from './util/keyCodes';
import PlayerInputter from './util/PlayerInputter';
import RunLoop from './util/RunLoop';
import TimerManager from './util/TimerManager';

import { setupCanvas } from './setupCanvas';
import { SnapshotState, GameStatus } from './GameState';
import Stage from './Stage';
import render from './render';

const MAX_FRAME_MS = 50;

interface PlayerOptions {
  color: string;
}

// interface Player {
//   entityOptions: PlayerOptions;
//   inputter: PlayerInputter;
//   ping: number;
// }

export default class HostGame {
  canvasCtx: CanvasRenderingContext2D;
  timerManager: TimerManager = new TimerManager();

  stage: Stage;
  status: GameStatus = 'waiting';
  startTime?: number;

  hostId: number;
  playerIdCounter = 0;
  players = new Map<number, PlayerOptions>();
  playerInputters = new Map<number, PlayerInputter>();
  peerToPlayerId = new Map<Peer.Instance, number>();
  pings = new Map<number, number>();

  lastPingTime: number = Date.now();

  constructor() {
    this.stage = new Stage(this);

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

  resetGame() {
    this.stage = new Stage(this);
  }

  startGame() {
    this.status = 'starting';
    this.startTime = Date.now() + 3000;

    this.timerManager.create({
      timerMs: 3000,
      onComplete: () => {
        this.status = 'playing';
        this.stage.start();
      },
    });
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
        this.pings.set(playerId, ping);
      }
    });

    peer.on('close', () => {
      this.peerToPlayerId.delete(peer);
      this.removePlayer(playerId);
    });

    peer.send(
      JSON.stringify({
        type: 'identity',
        data: {
          id: playerId,
        },
      })
    );
  }

  private onClientKeyDown(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.handleKeyDown(keyCode);
  }

  private onClientKeyUp(playerId: number, keyCode: number): void {
    this.playerInputters.get(playerId)!.handleKeyUp(keyCode);
  }

  private addPlayer(playerOptions: PlayerOptions): number {
    const playerId = this.playerIdCounter;
    this.playerIdCounter += 1;

    this.players.set(playerId, playerOptions);
    this.playerInputters.set(playerId, new PlayerInputter());

    this.stage.addPlayer(playerId, playerOptions);

    return playerId;
  }

  private removePlayer(playerId: number): void {
    // TODO: probably don't directly access state here...
    this.stage.state.players.delete(playerId);
    this.playerInputters.delete(playerId);
    this.pings.delete(playerId);
    this.players.delete(playerId);
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
    const serialized = ARSON.encode(this.getSnapshotState());
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

    render({
      ctx: this.canvasCtx,
      state: this.getSnapshotState(),
      localPlayerId: this.hostId,
      isHost: true,
    });
  }

  private update(dt: number) {
    this.timerManager.update(dt);

    const hostInputter = this.playerInputters.get(this.hostId)!;

    if (this.status === 'waiting') {
      if (hostInputter.keysDown.has(keyCodes.SPACE)) {
        this.startGame();
      }
    } else if (this.status === 'gameOver') {
      if (hostInputter.keysDown.has(keyCodes.R)) {
        this.resetGame();
        this.startGame();
      }
    } else if (this.status === 'cleared') {
      if (hostInputter.keysDown.has(keyCodes.R)) {
        this.resetGame();
        this.startGame();
      }
    } else if (this.status === 'playing') {
      this.stage.update(dt);
    }
  }

  getSnapshotState(): SnapshotState {
    const stageState = this.stage.state;

    return {
      ...stageState,
      status: this.status,
      startTime: this.startTime,
    };
  }
}
