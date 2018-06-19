import { Component, GameObject, Keys } from 'pearl';
import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import { levelTiles } from '../levels';
import Game from './Game';
import World from './World';

export type GameState = 'waiting' | 'gameOver' | 'cleared' | 'playing';

export default class Session extends Component<null> {
  worldObj!: GameObject;

  gameState: GameState = 'waiting';

  init() {
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
    this.gameState = 'playing';
    this.createWorld();
    const world = this.worldObj.getComponent(World);
    world.start();
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
      const text = isHost
        ? 'press space to start'
        : 'waiting for host to start game...';
      ctx.fillText(text, this.pearl.renderer.getViewSize().x / 2, 420);
      // } else if (gameState === 'starting') {
      //   const text = `${Math.ceil((state.startTime! - Date.now()) / 1000)}...`;
      //   ctx.fillText(text, WIDTH / 2, 420);
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
