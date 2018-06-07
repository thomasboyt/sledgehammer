import GameState from './GameState';
import render from './render';
import PlayerInputter from './util/PlayerInputter';
import * as Peer from 'simple-peer';
import * as ARSON from 'arson';
import { setupCanvas } from './setupCanvas';

export default class ClientGame {
  hostPeer: Peer.Instance;
  canvasCtx: CanvasRenderingContext2D;

  constructor(hostPeer: Peer.Instance) {
    this.hostPeer = hostPeer;

    hostPeer.on('data', (strData: string) => {
      const msg = JSON.parse(strData);
      // TODO: support message types and whatever
      if (msg.type === 'snapshot') {
        this.onHostSnapshot(msg.data);
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
  }

  sendToHost(data: {}) {
    const serialized = JSON.stringify(data);
    this.hostPeer.send(serialized);
  }

  onHostSnapshot(snapshot: string) {
    const state = ARSON.decode(snapshot) as GameState;
    render(this.canvasCtx, state, false);
  }
}
