import { Component } from 'pearl';
import { NetworkingHost, NetworkingClient } from 'pearl-networking';
import Session from './Session';
import {
  WIDTH,
  HEIGHT,
  WORLD_SIZE_HEIGHT,
  TILE_SIZE,
  lobbyServer,
} from '../constants';
import showRoomLink from '../roomLink';

interface Options {
  isHost: boolean;
  roomCode?: string;
}

export default class Game extends Component<Options> {
  isHost!: boolean;
  roomCode?: string;

  create(opts: Options) {
    this.isHost = opts.isHost;
    this.roomCode = opts.roomCode;
  }

  init() {
    if (this.isHost) {
      this.runCoroutine(this.initializeHost.bind(this));
    } else {
      this.runCoroutine(this.initializeClient.bind(this));
    }
  }

  *initializeHost() {
    const networkingHost = this.getComponent(NetworkingHost);

    const roomCode = yield networkingHost.connect(lobbyServer);
    showRoomLink(roomCode);

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

    if (!this.roomCode) {
      throw new Error('missing roomCode, did you forget to pass it?');
    }

    showRoomLink(this.roomCode);

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

    ctx.font = '16px monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    if (this.isHost) {
      const host = this.getComponent(NetworkingHost);
      if (host.connectionState === 'connecting') {
        ctx.fillText('connecting to lobby...', WIDTH / 2, 200);
      }
    } else {
      const client = this.getComponent(NetworkingClient);

      if (client.connectionState === 'connecting') {
        ctx.fillText('connecting', WIDTH / 2, 200);
      } else if (client.connectionState === 'error') {
        ctx.fillText('connection error:', WIDTH / 2, 200);
        ctx.fillText(client.errorReason!, WIDTH / 2, 220);
      } else if (client.connectionState === 'closed') {
        ctx.fillText('connection closed', WIDTH / 2, 200);
      }
    }
  }
}
