import { createPearl } from 'pearl';
import * as Peer from 'simple-peer';

import { WIDTH, HEIGHT } from '../src/constants';
import Game from './components/Game';
import NetworkingHost from './components/NetworkingHost';
import NetworkingClient from './components/NetworkingClient';
import networkedPrefabs from './networkedPrefabs';

interface Options {
  isHost: boolean;
  hostPeer?: Peer.Instance;
}

export default function createGame(opts: Options) {
  const { isHost, hostPeer } = opts;

  let networkingComponent;

  if (isHost) {
    networkingComponent = new NetworkingHost({ prefabs: networkedPrefabs });
  } else {
    networkingComponent = new NetworkingClient({ prefabs: networkedPrefabs });
    networkingComponent.registerHostPeer(hostPeer!);
  }

  return createPearl({
    rootComponents: [networkingComponent, new Game({ isHost })],
    width: WIDTH,
    height: HEIGHT,
    canvas: document.getElementById('game') as HTMLCanvasElement,
  });
}
