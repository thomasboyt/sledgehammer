import { createPearl, AssetManager, AudioManager } from 'pearl';
import * as Peer from 'simple-peer';

import { WIDTH, HEIGHT } from './constants';
import Game from './components/Game';
import NetworkingHost from './components/networking/NetworkingHost';
import NetworkingClient from './components/networking/NetworkingClient';
import networkedPrefabs from './networkedPrefabs';

interface Options {
  isHost: boolean;
  hostPeer?: Peer.Instance;
}

const assets = {
  images: {
    player: require('../assets/player-sheet.png'),
  },
  audio: {},
};

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
    rootComponents: [
      networkingComponent,
      new AudioManager({
        defaultGain: 0.5,
      }),
      new AssetManager(assets),
      new Game({ isHost }),
    ],
    width: WIDTH,
    height: HEIGHT,
    canvas: document.getElementById('game') as HTMLCanvasElement,
  });
}
