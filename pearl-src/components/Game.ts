import { Component } from 'pearl';
import NetworkingHost from './NetworkingHost';
import networkedObjects from '../networkedObjects';
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
      const playerObject = networkedObjects.player.create();
      playerObject.getComponent(Player).playerId = networkingPlayer.id;
      networkingHost.registerNetworkedObject('player', playerObject);
      this.pearl.entities.add(playerObject);
    });

    // create local player
    networkingHost.addLocalPlayer();
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'black';
    const size = this.pearl.renderer.getViewSize();
    ctx.fillRect(0, 0, size.x, size.y);
  }
}
