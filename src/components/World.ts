import {
  Component,
  Coordinates,
  PolygonCollider,
  GameObject,
  Physical,
} from 'pearl';
import { sample, sampleSize } from 'lodash-es';

import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
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
import Delegate from '../util/Delegate';
import TileMapRenderer from './TileMapRenderer';

const ENEMY_COUNT = 50;
const ENEMY_TYPES = ['archer', 'lemonShark', 'blueThing'];
const SPAWN_MORE = true;

export default class World extends Component<null> {
  sessionObj?: GameObject;

  spawns: Coordinates[] = [];
  nextSpawnIndex = 0;

  players = new Map<number, GameObject>();

  onPlayerGotPickup = new Delegate<{ playerId: number }>();

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
    const candidateTiles = this.getCandidateTiles();
    const pickupTile = randomChoice(candidateTiles)!;

    const pickupObj = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('pickup');

    const tileMap = this.getComponent(TileMap);
    pickupObj.getComponent(Physical).center = {
      x: pickupTile.x * tileMap.tileSize + tileMap.tileSize / 2,
      y: pickupTile.y * tileMap.tileSize + tileMap.tileSize / 2,
    };
  }

  private isNearPlayer({ x, y }: Coordinates) {
    const playerTilePositions = [...this.players.values()].map((player) => {
      return player.getComponent(TileEntity).tilePosition;
    });

    return playerTilePositions.some((pos) => {
      const dx = pos.x - x;
      const dy = pos.y - y;
      return Math.abs(dx) < 5 && Math.abs(dy) < 5;
    });
  }

  private isNearSpawn({ x, y }: Coordinates): boolean {
    // TODO: use pathfinding for this in the future?
    return this.spawns.some((spawnPos) => {
      const dx = spawnPos.x - x;
      const dy = spawnPos.y - y;
      return Math.abs(dx) < 5 && Math.abs(dy) < 5;
    });
  }

  private getCandidateTiles(): Coordinates[] {
    const tileMap = this.getComponent(TileMap);

    const candidates: Coordinates[] = [];
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

  private addEnemy(tilePos: Coordinates) {
    const type = sample(ENEMY_TYPES)!;

    const enemyObj = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab(type);

    const choices = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const facing = sample(choices)!;

    const tileEntity = enemyObj.getComponent(TileEntity);
    tileEntity.world = this.gameObject;
    tileEntity.setPosition(tilePos);

    const enemy = enemyObj.getComponent(BaseEnemy);
    enemy.setFacing({ x: facing[0], y: facing[1] });
  }

  addPlayer(sessionPlayer: SessionPlayer) {
    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    const networkingHost = this.pearl.obj.getComponent(NetworkingHost);

    const playerObject = networkingHost.createNetworkedPrefab('player');
    const player = playerObject.getComponent(Player);
    player.playerId = sessionPlayer.id;
    player.color = sessionPlayer.color;

    const tileEntity = playerObject.getComponent(TileEntity);
    tileEntity.world = this.gameObject;
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
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    this.handleCollisions();

    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    // TODO: WHATEVER THE WIN STATE ENDS UP BEING

    const allPlayersDead = [...this.players.values()].every(
      (player) => player.getComponent(Player).playerState === 'dead'
    );

    if (allPlayersDead) {
      this.sessionObj!.getComponent(Session).gameState = 'gameOver';
    }
  }

  handleCollisions() {
    // TODO: maybe do this via parent-child relationships if i can figure out
    // how to implement with networking
    const players = this.pearl.entities.all('player');
    const enemies = this.pearl.entities.all('enemy');
    const bullets = this.pearl.entities.all('bullet');
    const pickups = this.pearl.entities.all('pickup');

    const tileMap = this.getComponent(TileMap);

    // BUG: with bullets and pickups, if multiple things are colliding with it,
    // the collision logic runs TWICE
    //
    // this would mean: 2 players would both get points for defeating an enemy
    // and more annoyingly, if 2 players get a pickup on the same frame, it
    // spawns TWO PICKUPS, lol

    for (let bullet of bullets) {
      const bulletCollider = bullet.getComponent(PolygonCollider);

      if (tileMap.isColliding(bulletCollider, [Tile.Wall])) {
        bullet.getComponent(Bullet).explode();
        continue;
      }

      for (let otherBullet of bullets) {
        if (bullet === otherBullet) {
          continue;
        }

        if (
          bulletCollider.isColliding(otherBullet.getComponent(PolygonCollider))
        ) {
          bullet.getComponent(Bullet).explode();
          otherBullet.getComponent(Bullet).explode();
        }
      }

      for (let player of players) {
        if (bulletCollider.isColliding(player.getComponent(PolygonCollider))) {
          if (player.getComponent(Player).playerState === 'alive') {
            bullet.getComponent(Bullet).explode();
            player.getComponent(Player).die();
          }
        }
      }

      for (let enemy of enemies) {
        if (bulletCollider.isColliding(enemy.getComponent(PolygonCollider))) {
          // destroy enemy
          if (enemy.getComponent(BaseEnemy).state === 'alive') {
            bullet.getComponent(Bullet).explode();
            enemy.getComponent(BaseEnemy).die();
            continue;
          }
        }
      }
    }

    for (let player of players) {
      for (let enemy of enemies) {
        if (
          player
            .getComponent(PolygonCollider)
            .isColliding(enemy.getComponent(PolygonCollider))
        ) {
          if (
            player.getComponent(Player).playerState === 'alive' &&
            enemy.getComponent(BaseEnemy).state === 'alive'
          ) {
            player.getComponent(Player).die();
          }
        }
      }

      for (let pickup of pickups) {
        if (
          player
            .getComponent(PolygonCollider)
            .isColliding(pickup.getComponent(PolygonCollider))
        ) {
          // pick up pickup and spawn a new one
          this.onPlayerGotPickup.call({
            playerId: player.getComponent(Player).playerId!,
          });

          this.pearl.entities.destroy(pickup);
          this.spawnNextPickup();
        }
      }
    }
  }

  private getNextSpawn() {
    const spawn = this.spawns[this.nextSpawnIndex % this.spawns.length];
    this.nextSpawnIndex += 1;
    return spawn;
  }

  onDestroy() {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const worldEntities = this.pearl.entities.all(
      'player',
      'enemy',
      'bullet',
      'pickup'
    );

    for (let entity of worldEntities) {
      this.pearl.entities.destroy(entity);
    }
  }
}
