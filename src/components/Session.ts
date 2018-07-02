import { Component, GameObject, Keys } from 'pearl';
import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import { levelTiles } from '../levels';
import Game from './Game';
import World from './World';
import { START_COUNTDOWN_MS } from '../constants';
import { difference } from 'lodash-es';
import { colorForSlot } from '../types';

export type GameState =
  | 'waiting'
  | 'starting'
  | 'gameOver'
  | 'cleared'
  | 'playing';

export interface SessionPlayer {
  id: number;
  score: number;
  // 1 - 4
  slot: number;
  color: [number, number, number];
}

export default class Session extends Component<null> {
  worldObj!: GameObject;

  gameState: GameState = 'waiting';
  startTime?: number;

  // xxx: this could be a map or something but this serializes easier and i
  // don't think finding one item out of four is gonna be a lot of overhead
  players: SessionPlayer[] = [];

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

    world.onPlayerGotPickup.add(this.handlePlayerGotPickup.bind(this));
  }

  startGame() {
    this.gameState = 'starting';
    this.startTime = Date.now() + START_COUNTDOWN_MS;
    this.createWorld();

    // set all scores to 0
    for (let player of this.players) {
      player.score = 0;
    }

    this.runCoroutine(function*(this: Session) {
      yield this.pearl.async.waitMs(START_COUNTDOWN_MS);

      this.gameState = 'playing';

      const world = this.worldObj.getComponent(World);
      world.start();
    });
  }

  addPlayer(networkingPlayer: NetworkingPlayer) {
    const availableSlots = difference(
      [1, 2, 3, 4],
      this.players.map((player) => player.slot)
    );

    if (availableSlots.length === 0) {
      console.error('no room for player who just joined');
      return;
    }

    const player = {
      id: networkingPlayer.id,
      slot: availableSlots[0],
      score: 0,
      color: colorForSlot.get(availableSlots[0])!,
    };

    this.worldObj.getComponent(World).addPlayer(player);

    this.players.push(player);
  }

  removePlayer(networkingPlayer: NetworkingPlayer) {
    this.worldObj.getComponent(World).removePlayer(networkingPlayer);

    this.players = this.players.filter(
      (player) => player.id !== networkingPlayer.id
    );
  }

  handlePlayerGotPickup({ playerId }: { playerId: number }) {
    const player = this.players.find((player) => player.id === playerId);
    player!.score += 100;
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
