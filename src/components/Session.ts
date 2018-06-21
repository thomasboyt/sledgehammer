import { Component, GameObject, Keys } from 'pearl';
import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import { levelTiles } from '../levels';
import Game from './Game';
import World from './World';
import { START_COUNTDOWN_MS } from '../constants';

export type GameState =
  | 'waiting'
  | 'starting'
  | 'gameOver'
  | 'cleared'
  | 'playing';

export default class Session extends Component<null> {
  worldObj!: GameObject;

  gameState: GameState = 'waiting';
  startTime?: number;

  create() {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    this.createWorld();
  }

  createWorld() {
    if (this.worldObj) {
      this.pearl.entities.destroy(this.worldObj);
    }

    this.worldObj = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('world');

    const world = this.worldObj.getComponent(World);
    world.sessionObj = this.gameObject;
    world.loadTileMap(levelTiles);
  }

  startGame() {
    this.gameState = 'starting';
    this.startTime = Date.now() + START_COUNTDOWN_MS;
    this.createWorld();

    this.pearl.async.schedule(
      function*(this: Session) {
        yield this.pearl.async.waitMs(START_COUNTDOWN_MS);

        this.gameState = 'playing';

        const world = this.worldObj.getComponent(World);
        world.start();
      }.bind(this)
    );
  }

  addPlayer(networkingPlayer: NetworkingPlayer) {
    this.worldObj.getComponent(World).addPlayer(networkingPlayer);
  }

  removePlayer(networkingPlayer: NetworkingPlayer) {
    this.worldObj.getComponent(World).removePlayer(networkingPlayer);
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const hostInputter = this.pearl.inputter;

    if (this.gameState === 'waiting') {
      if (hostInputter.isKeyDown(Keys.space)) {
        this.startGame();
      }
    } else if (this.gameState === 'gameOver') {
      if (hostInputter.isKeyDown(Keys.r)) {
        this.startGame();
      }
    } else if (this.gameState === 'cleared') {
      if (hostInputter.isKeyDown(Keys.r)) {
        this.startGame();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const { isHost } = this.pearl.obj.getComponent(Game);
    const { gameState } = this;

    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';

    if (gameState === 'waiting') {
      let text: string;

      if (isHost) {
        const connected = this.pearl.obj.getComponent(NetworkingHost).players
          .size;
        text = `press space to start (${connected} connected)`;
      } else {
        text = 'waiting for host to start game...';
      }

      ctx.fillText(text, this.pearl.renderer.getViewSize().x / 2, 420);
    } else if (gameState === 'starting') {
      const text = `${Math.ceil((this.startTime! - Date.now()) / 1000)}...`;
      ctx.fillText(text, this.pearl.renderer.getViewSize().x / 2, 420);
    } else if (gameState === 'cleared') {
      const text = 'you won!';
      ctx.fillText(text, this.pearl.renderer.getViewSize().x / 2, 420);
    } else if (gameState === 'gameOver') {
      const text = isHost ? 'game over :( press R to retry' : 'game over :(';
      ctx.fillText(text, this.pearl.renderer.getViewSize().x / 2, 420);
    }

    // ctx.textAlign = 'left';
    // const pings = [...state.pings.values()].filter((ping) => !!ping).join(', ');
    // ctx.fillText(`pings: ${pings}`, 20, 460);
  }
}
