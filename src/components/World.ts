import {
  Component,
  Vector2,
  ShapeCollider,
  Physical,
  Entity,
  TileMapCollider,
} from 'pearl';
import { sample, sampleSize } from 'lodash-es';

import { NetworkingHost, NetworkingPlayer } from 'pearl-networking';
import Player from './Player';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import TileMap from './TileMap';
import { LevelData } from '../levels';
import Game from './Game';
import Bullet from './Bullet';
import { randomChoice, getRandomInt } from '../util/math';
import BaseEnemy from './enemies/BaseEnemy';
import Session, { SessionPlayer } from './Session';
import TileMapRenderer from './TileMapRenderer';
import { NetworkedComponent, NetworkedEntity } from 'pearl-networking';

const ENEMY_COUNT = 50;
const ENEMY_TYPES = ['archer', 'lemonShark', 'blueThing'];
const SPAWN_MORE = true;

interface WorldSnapshot {
  tiles: string[][];
  wallColor?: string;
  sessionId: string;
}

export default class World extends Component<null>
  implements NetworkedComponent<WorldSnapshot> {
  sessionObj?: Entity;

  pickupsCollected = 0;
  private spawns: Vector2[] = [];
  private nextSpawnIndex = 0;

  private players = new Map<string, Entity>();

  loadLevel(level: LevelData) {
    const tileMap = this.getComponent(TileMap) as TileMap<Tile>;
    tileMap.setTiles(level.tiles);

    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Spawn) {
        this.spawns.push({ x, y });
      }
    });

    this.getComponent(TileMapRenderer).wallColor = level.color;
  }

  start() {
    this.players = new Map();

    const players = this.sessionObj!.getComponent(Session).players;
    for (let player of players) {
      this.addPlayer(player);
    }

    this.spawnEnemies();
    this.spawnNextPickup();

    if (SPAWN_MORE) {
      this.runCoroutine(function*(this: World) {
        const shouldSpawn = () =>
          this.sessionObj!.getComponent(Session).gameState === 'playing';

        yield this.pearl.async.waitMs(3000);

        while (shouldSpawn()) {
          this.spawnEnemy();
          yield this.pearl.async.waitMs(3000);
        }
      });
    }
  }

  private spawnNextPickup() {
    // const candidateTiles = this.getCandidateTiles();
    // const pickupTile = randomChoice(candidateTiles)!;

    // DEBUG: spawn pickup next to player
    const playerTile = [...this.players.values()][0].getComponent(TileEntity)
      .tilePosition;
    const pickupTile = { x: playerTile.x - 1, y: playerTile.y };

    const pickupObj = this.pearl.root
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('pickup');

    this.entity.appendChild(pickupObj);

    const tileMap = this.getComponent(TileMap);
    const center = tileMap.tileCoordinatesToWorldCenter(pickupTile);

    pickupObj.getComponent(Physical).center = {
      x: center.x,
      y: center.y,
    };
  }

  private isNearPlayer({ x, y }: Vector2) {
    const playerTilePositions = [...this.players.values()].map((player) => {
      return player.getComponent(TileEntity).tilePosition;
    });

    return playerTilePositions.some((pos) => {
      const dx = pos.x - x;
      const dy = pos.y - y;
      return Math.abs(dx) < 5 && Math.abs(dy) < 5;
    });
  }

  private isNearSpawn({ x, y }: Vector2): boolean {
    // TODO: use pathfinding for this in the future?
    return this.spawns.some((spawnPos) => {
      const dx = spawnPos.x - x;
      const dy = spawnPos.y - y;
      return Math.abs(dx) < 5 && Math.abs(dy) < 5;
    });
  }

  private getCandidateTiles(): Vector2[] {
    const tileMap = this.getComponent(TileMap);

    const candidates: Vector2[] = [];
    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Empty) {
        if (!this.isNearSpawn({ x, y }) && !this.isNearPlayer({ x, y })) {
          candidates.push({ x, y });
        }
      }
    });

    return candidates;
  }

  private spawnEnemies() {
    const enemyCount = ENEMY_COUNT;
    const availableTiles = this.getCandidateTiles();

    const tiles = sampleSize(availableTiles, enemyCount);

    tiles.forEach((tilePos) => {
      this.runCoroutine(function*(this: World) {
        yield this.pearl.async.waitMs(getRandomInt(500, 1000));
        this.addEnemy(tilePos);
      });
    });
  }

  private spawnEnemy() {
    const tilePos = sample(this.getCandidateTiles())!;
    this.addEnemy(tilePos);
  }

  private addEnemy(tilePos: Vector2) {
    const type = sample(ENEMY_TYPES)!;

    const enemyObj = this.pearl.root
      .getComponent(NetworkingHost)
      .createNetworkedPrefab(type);

    this.entity.appendChild(enemyObj);

    const choices = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const facing = sample(choices)!;

    const tileEntity = enemyObj.getComponent(TileEntity);
    tileEntity.world = this.entity;
    tileEntity.setPosition(tilePos);

    const enemy = enemyObj.getComponent(BaseEnemy);
    enemy.setFacing({ x: facing[0], y: facing[1] });
  }

  addPlayer(sessionPlayer: SessionPlayer) {
    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    const networkingHost = this.pearl.root.getComponent(NetworkingHost);

    const playerObject = networkingHost.createNetworkedPrefab('player');
    this.entity.appendChild(playerObject);

    const player = playerObject.getComponent(Player);
    player.playerId = sessionPlayer.id;
    player.color = sessionPlayer.color;

    const tileEntity = playerObject.getComponent(TileEntity);
    tileEntity.world = this.entity;
    tileEntity.setPosition(this.getNextSpawn());

    this.players.set(sessionPlayer.id, playerObject);
  }

  removePlayer(networkingPlayer: NetworkingPlayer) {
    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    const player = this.players.get(networkingPlayer.id);
    if (player) {
      this.pearl.entities.destroy(player);
    }
  }

  update(dt: number) {
    if (!this.pearl.root.getComponent(Game).isHost) {
      return;
    }

    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    if (this.pickupsCollected === 1) {
      this.sessionObj!.getComponent(Session).levelFinished();
      return;
    }

    const allPlayersDead = [...this.players.values()].every(
      (player) => player.getComponent(Player).playerState === 'dead'
    );

    if (allPlayersDead) {
      this.sessionObj!.getComponent(Session).gameOver();
    }
  }

  playerCollectedPickup(player: Entity, pickup: Entity) {
    const playerId = player.getComponent(Player).playerId!;
    this.sessionObj!.getComponent(Session).addScore(playerId, 100);

    this.pickupsCollected += 1;

    this.pearl.entities.destroy(pickup);
    this.spawnNextPickup();
  }

  private getNextSpawn() {
    const spawn = this.spawns[this.nextSpawnIndex % this.spawns.length];
    this.nextSpawnIndex += 1;
    return spawn;
  }

  serialize() {
    const map: TileMap<any> = this.getComponent(TileMap);
    const renderer = this.getComponent(TileMapRenderer);
    return {
      tiles: map.tiles!,
      wallColor: renderer.wallColor,
      sessionId: this.sessionObj!.getComponent(NetworkedEntity).id,
    };
  }

  deserialize(snapshot: WorldSnapshot, entitiesById: Map<string, Entity>) {
    const map = this.getComponent(TileMap);
    const renderer = this.getComponent(TileMapRenderer);

    renderer.wallColor = snapshot.wallColor;

    if (!map.tiles) {
      map.setTiles(snapshot.tiles);
    }

    this.sessionObj = entitiesById.get(snapshot.sessionId)!;
  }
}
