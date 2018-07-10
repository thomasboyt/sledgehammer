import { GameObject, Physical } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import TileMap from '../components/TileMap';
import TileMapRenderer from '../components/TileMapRenderer';
import World from '../components/World';
import { ZIndex } from '../types';
import { WORLD_SIZE_HEIGHT, TILE_SIZE, HEIGHT } from '../constants';
import {
  serializePhysical,
  deserializePhysical,
  PhysicalSnapshot,
} from '../serializers/serializePhysical';
import NetworkedObject from '../components/networking/NetworkedObject';

interface WorldSnapshot {
  tiles: string[][];
  wallColor?: string;
  sessionId: string;
}

const world: NetworkedPrefab<WorldSnapshot> = {
  type: 'world',

  zIndex: ZIndex.World,

  createComponents: (pearl) => {
    // XXX: This is hacky because instead of passing the actual center, we pass
    // the top left corner, since all the children get translated by that
    // const gameCenter = pearl.renderer.getViewCenter();
    const mapHeight = WORLD_SIZE_HEIGHT * TILE_SIZE;
    const center = {
      x: 8,
      y: HEIGHT - mapHeight,
    };

    return [
      new Physical({ center }),
      new TileMap({
        tileSize: 16,
      }),
      new TileMapRenderer(),
      new World(),
    ];
  },

  serialize(obj: GameObject): WorldSnapshot {
    const map: TileMap<any> = obj.getComponent(TileMap);
    const renderer = obj.getComponent(TileMapRenderer);
    const world = obj.getComponent(World);
    return {
      tiles: map.tiles!,
      wallColor: renderer.wallColor,
      sessionId: world.sessionObj!.getComponent(NetworkedObject).id,
    };
  },

  deserialize(obj: GameObject, snapshot: WorldSnapshot, objectsById) {
    const map = obj.getComponent(TileMap);
    const renderer = obj.getComponent(TileMapRenderer);

    renderer.wallColor = snapshot.wallColor;

    if (!map.tiles) {
      map.setTiles(snapshot.tiles);
    }

    const world = obj.getComponent(World);
    world.sessionObj = objectsById.get(snapshot.sessionId)!;
  },
};

export default world;
