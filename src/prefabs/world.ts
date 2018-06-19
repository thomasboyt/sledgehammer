import { GameObject } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import TileMap from '../components/TileMap';
import TileMapRenderer from '../components/TileMapRenderer';
import World from '../components/World';

interface WorldSnapshot {
  tiles: string[][];
}

const world: NetworkedPrefab<WorldSnapshot> = {
  type: 'world',

  createComponents: () => {
    return [
      new TileMap({
        tileSize: 16,
      }),
      new TileMapRenderer(),
      new World(),
    ];
  },

  serialize(obj: GameObject): WorldSnapshot {
    const map: TileMap<any> = obj.getComponent(TileMap);
    return { tiles: map.tiles! };
  },

  deserialize(obj: GameObject, snapshot: WorldSnapshot) {
    const map = obj.getComponent(TileMap);

    if (map.tiles) {
      return;
    } else {
      map.tiles = snapshot.tiles;
    }
  },
};

export default world;
