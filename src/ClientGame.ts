import GameState from './GameState';
import keyCodes from './util/keyCodes';
import render from './render';
import { interruptKeyCodes } from './util/keyCodes';
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

    window.addEventListener('keydown', (e) => {
      this.sendToHost({
        type: 'keyDown',
        data: {
          keyCode: e.keyCode,
        },
      });

      if (interruptKeyCodes.has(e.keyCode)) {
        e.preventDefault();
        return false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.sendToHost({
        type: 'keyUp',
        data: {
          keyCode: e.keyCode,
        },
      });
    });

    const canvas = setupCanvas('#game');
    this.canvasCtx = canvas.getContext('2d')!;
  }

  sendToHost(data: {}) {
    const serialized = JSON.stringify(data);
    this.hostPeer.send(serialized);
  }

  onHostSnapshot(snapshot: string) {
    const state = ARSON.decode(snapshot) as GameState;
    render(this.canvasCtx, state);
  }
}
