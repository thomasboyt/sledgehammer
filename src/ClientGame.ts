import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

import PlayerInputter from './util/PlayerInputter';
import RunLoop from './util/RunLoop';
import { setupCanvas } from './setupCanvas';

import render from './render';
import { SnapshotState } from './GameState';
import {
  serializeMessage,
  deserializeMessage,
  ClientMessage,
} from './messages';

export default class ClientGame {
  hostPeer: Peer.Instance;
  canvasCtx: CanvasRenderingContext2D;
  lastState?: SnapshotState;
  playerId?: number;

  constructor(hostPeer: Peer.Instance) {
    this.hostPeer = hostPeer;

    hostPeer.on('data', (strData: string) => {
      const msg = deserializeMessage('host', strData);

      if (msg.type === 'snapshot') {
        this.onHostSnapshot(msg.data);
      } else if (msg.type === 'identity') {
        this.playerId = msg.data.id;
      } else if (msg.type === 'ping') {
        this.sendToHost({
          type: 'pong',
        });
      }
    });

    const inputter = new PlayerInputter({
      onKeyDown: (keyCode) => {
        this.sendToHost({
          type: 'keyDown',
          data: {
            keyCode,
          },
        });
      },
      onKeyUp: (keyCode) => {
        this.sendToHost({
          type: 'keyUp',
          data: {
            keyCode,
          },
        });
      },
    });

    inputter.registerLocalListeners();

    const canvas = setupCanvas('#game');
    this.canvasCtx = canvas.getContext('2d')!;

    const loop = new RunLoop();
    loop.onTick(this.onTick.bind(this));
    loop.start();
  }

  sendToHost(msg: ClientMessage) {
    this.hostPeer.send(serializeMessage('client', msg));
  }

  onHostSnapshot(snapshot: string) {
    const state = ARSON.decode(snapshot) as SnapshotState;
    this.lastState = state;
  }

  private onTick(dt: number): void {
    if (!this.lastState) {
      return;
    }

    render({
      ctx: this.canvasCtx,
      state: this.lastState,
      localPlayerId: this.playerId || -1,
      isHost: false,
      time: Date.now(),
    });
  }
}
