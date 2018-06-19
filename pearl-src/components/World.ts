import { Component, Coordinates, PolygonCollider } from 'pearl';
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

export default class World extends Component<null> {
  spawns: Coordinates[] = [];
  nextSpawnIndex = 0;

  loadTileMap(levelTiles: string) {
    const tileMap = this.getComponent(TileMap) as TileMap<Tile>;
    const tiles = getTilesFromString(levelTiles);
    tileMap.setTiles(tiles);

    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Spawn) {
        this.spawns.push({ x, y });
      }
    });

    // generate enemies
    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Empty) {
        if (getRandomInt(0, 100) <= 1) {
          const choices = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          const facing = randomChoice(choices);

          const enemyObj = this.pearl.obj
            .getComponent(NetworkingHost)
            .createNetworkedPrefab('enemy');

          const tileEntity = enemyObj.getComponent(TileEntity);
          tileEntity.world = this.gameObject;
          tileEntity.setPosition({ x, y });

          const enemy = enemyObj.getComponent(Enemy);
          enemy.facing = { x: facing[0], y: facing[1] };
          // enemy.setFacing({ x: facing[0], y: facing[1] });
        }
      }
    });
  }

  addPlayer(networkingPlayer: NetworkingPlayer) {
    const networkingHost = this.pearl.obj.getComponent(NetworkingHost);

    const playerObject = networkingHost.createNetworkedPrefab('player');
    playerObject.getComponent(Player).playerId = networkingPlayer.id;

    const tileEntity = playerObject.getComponent(TileEntity);
    tileEntity.world = this.gameObject;
    tileEntity.setPosition(this.getNextSpawn());
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
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

      for (let player of players) {
        if (bulletCollider.isColliding(player.getComponent(PolygonCollider))) {
          // set player to dead
          bullet.getComponent(Bullet).explode();
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
          // set player to dead
        }
      }
    }
  }

  private getNextSpawn() {
    const spawn = this.spawns[this.nextSpawnIndex % this.spawns.length];
    this.nextSpawnIndex += 1;
    return spawn;
  }
}
