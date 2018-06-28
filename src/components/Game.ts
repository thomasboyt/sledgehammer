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

    // XXX: This is kind of a hack rn because what I actually want is a render tree that translates
    // rendering relative to the parent Physical
    // this is: a hell of a lot of work to implement and I don't want to do it right now
    // TODO: write up a doc in the pearl repo about this!
    const center = this.pearl.renderer.getViewCenter();
    this.pearl.renderer.setViewCenter({
      x: center.x - 8,
      y: center.y - 20,
    });

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
    const center = this.pearl.renderer.getViewCenter();
    ctx.fillRect(center.x - size.x / 2, center.y - size.y / 2, size.x, size.y);
  }
}
