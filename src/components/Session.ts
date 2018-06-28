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
}
