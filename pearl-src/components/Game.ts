import { Component } from 'pearl';
import NetworkingHost from './NetworkingHost';
import networkedObjects from '../networkedPrefabs';
import Player from './Player';

interface Options {
  isHost: boolean;
}

export default class Game extends Component<Options> {
  isHost!: boolean;

  init(opts: Options) {
    this.isHost = opts.isHost;

    if (this.isHost) {
      this.initializeHost();
    }
  }

  initializeHost() {
    const networkingHost = this.getComponent(NetworkingHost);

    networkingHost.onPlayerAdded.add(({ networkingPlayer }) => {
      const playerObject = networkingHost.createNetworkedPrefab('player');
      playerObject.getComponent(Player).playerId = networkingPlayer.id;
    });

    // create local player
    networkingHost.addLocalPlayer();

    // TODO: HOW CAN I SET DEFAULT STUFF ON A PREFAB
    // will this be safe to sync...?
    // networkingHost.createNetworkedPrefab('wall', {
    //   center: { x: 100, y: 100 },
    //   size: { x: 100, y: 100 },
    // });
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'black';
    const size = this.pearl.renderer.getViewSize();
    ctx.fillRect(0, 0, size.x, size.y);
  }
}
