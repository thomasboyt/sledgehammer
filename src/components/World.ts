import {
  Component,
  Coordinates,
  PolygonCollider,
  GameObject,
  Keys,
} from 'pearl';
import { sampleSize } from 'lodash-es';

import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import Player from './Player';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import TileMap from './TileMap';
import { getTilesFromString } from '../levels';
import Game from './Game';
import Bullet from './Bullet';
import { getRandomInt, randomChoice } from '../util/math';
import Enemy from './Enemy';
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
  }

  private isNearSpawn({ x, y }: Coordinates): boolean {
    // TODO: use pathfinding for this in the future?
    return this.spawns.some((spawnPos) => {
      const dx = spawnPos.x - x;
      const dy = spawnPos.y - y;
      return Math.abs(dx) < 3 || Math.abs(dy) < 3;
    });
  }

  private spawnEnemies() {
    const tileMap = this.getComponent(TileMap);

    // generate enemies
    const enemyCount = 40;
    const availableTiles: Coordinates[] = [];
    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Empty) {
        if (!this.isNearSpawn({ x, y })) {
          availableTiles.push({ x, y });
        }
      }
    });

    const tiles = sampleSize(availableTiles, 40);
    tiles.forEach(({ x, y }) => {
      const choices = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const facing = randomChoice(choices);

      const enemyObj = this.pearl.obj
        .getComponent(NetworkingHost)
        .createNetworkedPrefab('enemy');

      const tileEntity = enemyObj.getComponent(TileEntity);
      tileEntity.world = this.gameObject;
      tileEntity.setPosition({ x, y });

      const enemy = enemyObj.getComponent(Enemy);
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

      // for (let player of players) {
      //   if (bulletCollider.isColliding(player.getComponent(PolygonCollider))) {
      //     bullet.getComponent(Bullet).explode();
      //     continue;
      //   }
      // }
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

    const entityTags = ['player', 'enemy', 'bullet'];
    const worldEntities = [...this.pearl.entities.all().values()].filter(
      (obj) => entityTags.some((tag) => obj.hasTag(tag))
    );

    for (let entity of worldEntities) {
      this.pearl.entities.destroy(entity);
    }
  }
}
