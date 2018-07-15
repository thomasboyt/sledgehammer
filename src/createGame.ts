require('../styles/font.css');
import { createPearl } from 'pearl';
import * as Peer from 'simple-peer';

import { WIDTH, HEIGHT } from './constants';
import Game from './components/Game';
import NetworkingHost from './components/networking/NetworkingHost';
import NetworkingClient from './components/networking/NetworkingClient';
import networkedPrefabs from './networkedPrefabs';
import SpriteSheetAsset from './SpriteSheetAsset';

interface Options {
  isHost: boolean;
  hostPeer?: Peer.Instance;
}

const assets = {
  player: new SpriteSheetAsset(require('../assets/player-sheet.png'), 16, 16),
  lemonShark: new SpriteSheetAsset(require('../assets/lemon-shark.png'), 8, 8),
  blueThing: new SpriteSheetAsset(require('../assets/blue-thing.png'), 8, 8),
  archer: new SpriteSheetAsset(require('../assets/archer.png'), 8, 8),
};

export default async function createGame(opts: Options) {
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
    assets,
  });
}
