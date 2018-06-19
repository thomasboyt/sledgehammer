import { Component, AssetManager } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import { getTilesFromString, levelTiles } from '../levels';
import World from './World';

interface Options {
  isHost: boolean;
}

export default class Game extends Component<Options> {
  isHost!: boolean;

  init(opts: Options) {
    this.isHost = opts.isHost;

    this.getComponent(AssetManager)
      .load()
      .then(() => {
        if (this.isHost) {
          this.initializeHost();
        }
      });
  }

  initializeHost() {
    const networkingHost = this.getComponent(NetworkingHost);

    const worldObject = networkingHost.createNetworkedPrefab('world');
    const world = worldObject.getComponent(World);

    world.loadTileMap(levelTiles);

    // TODO: update this if world changes
    networkingHost.onPlayerAdded.add(({ networkingPlayer }) =>
      world.addPlayer(networkingPlayer)
    );

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
