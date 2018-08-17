import { Component, GameObject, Keys, Entity } from 'pearl';
import {
  NetworkingHost,
  NetworkingPlayer,
  NetworkedComponent,
  NetworkedEntity,
} from 'pearl-networking';
import { levels } from '../levels';
import Game from './Game';
import World from './World';
import { START_COUNTDOWN_MS } from '../constants';
import { difference } from 'lodash-es';
import { colorForSlot } from '../types';
import { randomChoice } from '../util/math';
import LevelTransitionManager from './LevelTransitionManager';

export type GameState =
  | 'waiting'
  | 'starting'
  | 'gameOver'
  | 'cleared'
  | 'playing';

export interface SessionPlayer {
  id: string;
  score: number;
  // 1 - 4
  slot: number;
  color: [number, number, number];
  isReady: boolean;
}

interface SessionSnapshot {
  gameState: GameState;
  startTime?: number;
  players: SessionPlayer[];
  worldId: string;
}

export default class Session extends Component<null>
  implements NetworkedComponent<SessionSnapshot> {
  worldObj!: GameObject;

  gameState: GameState = 'waiting';
  startTime?: number;

  // xxx: this could be a map or something but this serializes easier and i
  // don't think finding one item out of four is gonna be a lot of overhead
  players: SessionPlayer[] = [];

  currentLevel = 0;

  create() {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    this.resetGame();
    this.createWorld();
  }

  private resetGame() {
    this.currentLevel = 0;

    // set all scores to 0
    for (let player of this.players) {
      player.score = 0;
    }
  }

  private createWorld() {
    if (this.worldObj) {
      this.pearl.entities.destroy(this.worldObj);
    }

    const levelIdx = this.currentLevel % levels.length;

    this.worldObj = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('world');

    const world = this.worldObj.getComponent(World);
    world.sessionObj = this.gameObject;
    world.loadLevel(levels[levelIdx]);
  }

  private startGame() {
    this.gameState = 'starting';
    this.startTime = Date.now() + START_COUNTDOWN_MS;
    this.createWorld();

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
      isReady: false,
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

  addScore(playerId: string, score: number) {
    const player = this.players.find((player) => player.id === playerId);
    player!.score += score;
  }

  gameOver() {
    this.gameState = 'gameOver';
  }

  levelFinished() {
    this.gameState = 'cleared';

    const transition = this.getComponent(LevelTransitionManager);
    transition.rpcSetPrevWorld();
    this.currentLevel += 1;
    this.createWorld();

    transition.start(() => {
      this.startGame();
    });
  }

  private togglePlayerReady(playerId: string) {
    const player = this.players.find((player) => player.id === playerId)!;
    player.isReady = true;

    const allReady = this.players.every((player) => player.isReady === true);
    if (allReady) {
      this.startGame();
    }
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const hostInputter = this.pearl.inputter;
    const networkedPlayers = [
      ...this.pearl.obj.getComponent(NetworkingHost).players.values(),
    ];

    if (this.gameState === 'waiting') {
      for (let player of networkedPlayers) {
        if (player.inputter.isKeyPressed(Keys.space)) {
          this.togglePlayerReady(player.id);
        }
      }
    } else if (this.gameState === 'gameOver') {
      if (hostInputter.isKeyDown(Keys.r)) {
        this.resetGame();
        this.startGame();
      }
    }
  }

  serialize() {
    return {
      gameState: this.gameState,
      startTime: this.startTime,
      players: this.players,
      worldId: this.worldObj.getComponent(NetworkedEntity).id,
    };
  }

  deserialize(snapshot: SessionSnapshot, entitiesById: Map<string, Entity>) {
    this.gameState = snapshot.gameState;
    this.startTime = snapshot.startTime;
    this.players = snapshot.players;
    this.worldObj = entitiesById.get(snapshot.worldId)!;
  }
}
