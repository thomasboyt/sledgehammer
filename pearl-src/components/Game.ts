import { Component, Keys } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import Session from './Session';

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

    const sessionObject = networkingHost.createNetworkedPrefab('session');
    const session = sessionObject.getComponent(Session);

    networkingHost.onPlayerAdded.add(({ networkingPlayer }) =>
      session.addPlayer(networkingPlayer)
    );

    networkingHost.onPlayerRemoved.add(({ networkingPlayer }) => {
      session.removePlayer(networkingPlayer);
    });

    networkingHost.addLocalPlayer();
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'black';
    const size = this.pearl.renderer.getViewSize();
    ctx.fillRect(0, 0, size.x, size.y);
  }
}
