import {
  Component,
  Coordinates,
  PolygonCollider,
  GameObject,
  Keys,
  Physical,
  PolygonRenderer,
} from 'pearl';
import { sample, sampleSize } from 'lodash-es';

import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import Player from './Player';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import TileMap from './TileMap';
import { getTilesFromString } from '../levels';
import Game from './Game';
import Bullet from './Bullet';
import { getRandomInt, randomChoice } from '../util/math';
import BaseEnemy from './enemies/BaseEnemy';
import Session from './Session';

export default class World extends Component<null> {
  sessionObj?: GameObject;

  spawns: Coordinates[] = [];
  nextSpawnIndex = 0;

  players = new Map<number, GameObject>();

  loadTileMap(levelTiles: string) {
    const tileMap = this.getComponent(TileMap) as TileMap<Tile>;
    const tiles = getTilesFromString(levelTiles);
    tileMap.setTiles(tiles);

    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Spawn) {
        this.spawns.push({ x, y });
      }
    });
  }

  start() {
    this.players = new Map();

    const players = this.pearl.obj.getComponent(NetworkingHost).players;
    for (let player of players.values()) {
      this.addPlayer(player);
    }

    this.spawnEnemies();
    this.spawnNextPickup();
  }

  private spawnNextPickup() {
    const candidateTiles = this.getCandidateTiles();
    const pickupTile = sample(candidateTiles)!;

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
    const enemyCount = 40;
    const availableTiles = this.getCandidateTiles();

    const tiles = sampleSize(availableTiles, enemyCount);
    tiles.forEach(({ x, y }) => {
      const choices = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const facing = randomChoice(choices);

      const type = randomChoice(['lemonShark', 'blueThing']);

      const enemyObj = this.pearl.obj
        .getComponent(NetworkingHost)
        .createNetworkedPrefab(type);

      const tileEntity = enemyObj.getComponent(TileEntity);
      tileEntity.world = this.gameObject;
      tileEntity.setPosition({ x, y });

      const enemy = enemyObj.getComponent(BaseEnemy);
      enemy.setFacing({ x: facing[0], y: facing[1] });
    });
  }

  addPlayer(networkingPlayer: NetworkingPlayer) {
    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    const networkingHost = this.pearl.obj.getComponent(NetworkingHost);

    const playerObject = networkingHost.createNetworkedPrefab('player');
    playerObject.getComponent(Player).playerId = networkingPlayer.id;

    const tileEntity = playerObject.getComponent(TileEntity);
    tileEntity.world = this.gameObject;
    tileEntity.setPosition(this.getNextSpawn());

    this.players.set(networkingPlayer.id, playerObject);
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

    if (this.sessionObj!.getComponent(Session).gameState !== 'playing') {
      return;
    }

    // TODO: maybe do this via parent-child relationships if i can figure out how to implement
    // with networking
    const entities = [...this.pearl.entities.all().values()];
    const players = entities.filter((obj) => obj.hasTag('player'));
    const enemies = entities.filter((obj) => obj.hasTag('enemy'));
    const bullets = entities.filter((obj) => obj.hasTag('bullet'));
    const pickups = entities.filter((obj) => obj.hasTag('pickup'));

    const tileMap = this.getComponent(TileMap);

    for (let bullet of bullets) {
      const bulletCollider = bullet.getComponent(PolygonCollider);

      if (tileMap.isColliding(bulletCollider, [Tile.Wall])) {
        bullet.getComponent(Bullet).explode();
        continue;
      }

      for (let enemy of enemies) {
        if (bulletCollider.isColliding(enemy.getComponent(PolygonCollider))) {
          // destroy enemy
          bullet.getComponent(Bullet).explode();
          this.pearl.entities.destroy(enemy);
          continue;
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
          player.getComponent(Player).die();
        }
      }

      for (let pickup of pickups) {
        if (
          player
            .getComponent(PolygonCollider)
            .isColliding(pickup.getComponent(PolygonCollider))
        ) {
          // pick up pickup and spawn a new one
          this.pearl.entities.destroy(pickup);
          this.spawnNextPickup();
        }
      }
    }

    if (enemies.length === 0) {
      // you done won
      this.sessionObj!.getComponent(Session).gameState = 'cleared';
    }

    const allPlayersDead = players.every(
      (player) => player.getComponent(Player).playerState === 'dead'
    );

    if (allPlayersDead) {
      this.sessionObj!.getComponent(Session).gameState = 'gameOver';
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

    const entityTags = ['player', 'enemy', 'bullet', 'pickup'];
    const worldEntities = [...this.pearl.entities.all().values()].filter(
      (obj) => entityTags.some((tag) => obj.hasTag(tag))
    );

    for (let entity of worldEntities) {
      this.pearl.entities.destroy(entity);
    }
  }
}
