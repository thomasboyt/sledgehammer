import { createPearl } from 'pearl';
import * as Peer from 'simple-peer';

import { WIDTH, HEIGHT } from '../src/constants';
import Game from './components/Game';
import NetworkingHost from './components/NetworkingHost';
import NetworkingClient from './components/NetworkingClient';
import networkedObjects from './networkedObjects';

interface Options {
  isHost: boolean;
  hostPeer?: Peer.Instance;
}

export default function createGame(opts: Options) {
  const { isHost, hostPeer } = opts;

  let networkingComponent;

  if (isHost) {
    networkingComponent = new NetworkingHost({ types: networkedObjects });
  } else {
    networkingComponent = new NetworkingClient({ types: networkedObjects });
    networkingComponent.registerHostPeer(hostPeer!);
  }

  return createPearl({
    rootComponents: [new Game({ isHost }), networkingComponent],
    width: WIDTH,
    height: HEIGHT,
    canvas: document.getElementById('game') as HTMLCanvasElement,
  });
}
