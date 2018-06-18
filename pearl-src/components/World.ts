import { Component, Coordinates } from 'pearl';
import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import Player from './Player';
import TileEntity from './TileEntity';
import { Tile } from '../types';
import TileMap from './TileMap';
import { getTilesFromString } from '../levels';
import Game from './Game';

export default class World extends Component<null> {
  spawns: Coordinates[] = [];
  nextSpawnIndex = 0;

  addPlayer(networkingPlayer: NetworkingPlayer) {
    const networkingHost = this.pearl.obj.getComponent(NetworkingHost);

    const playerObject = networkingHost.createNetworkedPrefab('player');
    playerObject.getComponent(Player).playerId = networkingPlayer.id;

    const tileEntity = playerObject.getComponent(TileEntity);
    tileEntity.world = this.gameObject;
    tileEntity.setPosition(this.getNextSpawn());
  }

  loadTileMap(levelTiles: string) {
    const tileMap = this.getComponent(TileMap) as TileMap<Tile>;
    const tiles = getTilesFromString(levelTiles);
    tileMap.tiles = tiles;

    tileMap.forEachTile(({ x, y }, value) => {
      if (value === Tile.Spawn) {
        this.spawns.push({ x, y });
      }
    });
  }

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    // test player-enemy collisions
    // test bullet-enemy collisions
    // test bullet-player collisions
    // test bullet-tile collisions? or maybe handle this in bullet update
  }

  private getNextSpawn() {
    const spawn = this.spawns[this.nextSpawnIndex % this.spawns.length];
    this.nextSpawnIndex += 1;
    return spawn;
  }
}
