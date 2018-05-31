import GameState from './GameState';
import keyCodes from './util/keyCodes';
import render from './render';
import { interruptKeyCodes } from './util/inputter';
import * as Peer from 'simple-peer';
import * as ARSON from 'arson';

export default class ClientGame {
  hostPeer: Peer.Instance;
  canvasCtx: CanvasRenderingContext2D;

  constructor(hostPeer: Peer.Instance) {
    this.hostPeer = hostPeer;

    hostPeer.on('data', (strData: string) => {
      const data = JSON.parse(strData);
      // TODO: support message types and whatever
      this.onHostSnapshot(data);
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

    this.canvasCtx = (document.getElementById(
      'game'
    ) as HTMLCanvasElement).getContext('2d')!;
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
