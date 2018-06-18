import {
  Physical,
  PolygonRenderer,
  PolygonCollider,
  Coordinates,
  GameObject,
} from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';

import Enemy from '../components/Enemy';
import TileEntity from '../components/TileEntity';
import WrappedEntityRenderer from '../components/WrappedEntityRenderer';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';

interface EnemySnapshot {
  center: Coordinates;
  vel: Coordinates;
}

const enemy: NetworkedPrefab<EnemySnapshot> = {
  type: 'player',

  createComponents: () => {
    return [
      new Enemy(),
      new Physical({
        center: { x: 120, y: 120 },
      }),
      new PolygonRenderer({ fillStyle: 'red' }),
      PolygonCollider.createBox({ width: 16, height: 16 }),
      new TileEntity(),
      new WrappedEntityRenderer({
        // TODO: would be nice if this came from TileMap or world somehow...
        worldWidth: TILE_SIZE * WORLD_SIZE_WIDTH,
        worldHeight: TILE_SIZE * WORLD_SIZE_HEIGHT,
      }),
    ];
  },

  serialize: (obj) => {
    const phys = obj.getComponent(Physical);
    return { center: phys.center, vel: phys.vel };
  },

  deserialize: (obj, snapshot, objectsById) => {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;
  },
};

export default enemy;
