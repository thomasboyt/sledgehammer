import { Component } from 'pearl';
import NetworkingHost from '../networking/components/NetworkingHost';
import Session from './Session';
import NetworkingClient from '../networking/components/NetworkingClient';
import {
  WIDTH,
  HEIGHT,
  WORLD_SIZE_HEIGHT,
  TILE_SIZE,
  lobbyServer,
} from '../constants';
import initializeClient from '../initializeClient';

interface Options {
  isHost: boolean;
  roomCode: string;
}

export default class Game extends Component<Options> {
  isHost!: boolean;
  roomCode!: string;

  init(opts: Options) {
    this.isHost = opts.isHost;
    this.roomCode = opts.roomCode;

    if (this.isHost) {
      this.runCoroutine(this.initializeHost.bind(this));
    } else {
      this.runCoroutine(this.initializeClient.bind(this));
    }
  }

  *initializeHost() {
    const networkingHost = this.getComponent(NetworkingHost);

    yield networkingHost.connect({
      groovejetUrl: lobbyServer,
      roomCode: this.roomCode,
    });

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

  *initializeClient() {
    const networkingClient = this.getComponent(NetworkingClient);

    yield networkingClient.connect({
      groovejetUrl: lobbyServer,
      roomCode: this.roomCode,
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'black';
    const size = this.pearl.renderer.getViewSize();
    const center = this.pearl.renderer.getViewCenter();
    ctx.fillRect(center.x - size.x / 2, center.y - size.y / 2, size.x, size.y);

    if (!this.isHost) {
      const client = this.getComponent(NetworkingClient);

      ctx.font = '16px monospace';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';

      if (client.connectionState === 'connecting') {
        ctx.fillText('connecting', WIDTH / 2, 200);
      } else if (client.connectionState === 'error') {
        ctx.fillText('connection error:', WIDTH / 2, 200);
        ctx.fillText(client.errorReason!, WIDTH / 2, 220);
      }
    }
  }
}
