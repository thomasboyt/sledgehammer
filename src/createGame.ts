import { createPearl, AudioManager } from 'pearl';
import * as Peer from 'simple-peer';

import { WIDTH, HEIGHT } from './constants';
import Game from './components/Game';
import NetworkingHost from './components/networking/NetworkingHost';
import NetworkingClient from './components/networking/NetworkingClient';
import networkedPrefabs from './networkedPrefabs';
import { loadAssets } from './assets';
import AssetManager from './components/AssetManager';

interface Options {
  isHost: boolean;
  hostPeer?: Peer.Instance;
}

const assetPaths = {
  images: {
    player: require('../assets/player-sheet.png'),
    lemonShark: require('../assets/lemon-shark.png'),
    blueThing: require('../assets/blue-thing.png'),
  },
  audio: {},
};

export default async function createGame(opts: Options) {
  const assets = await loadAssets(assetPaths);

  const { isHost, hostPeer } = opts;

  let networkingComponent;

  if (isHost) {
    networkingComponent = new NetworkingHost({ prefabs: networkedPrefabs });
  } else {
    networkingComponent = new NetworkingClient({ prefabs: networkedPrefabs });
    networkingComponent.registerHostPeer(hostPeer!);
  }

  const canvas = document.getElementById('game') as HTMLCanvasElement;

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
