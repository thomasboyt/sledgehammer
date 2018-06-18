import {
  Physical,
  PolygonRenderer,
  PolygonCollider,
  Coordinates,
  GameObject,
} from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';

import Player from '../components/Player';
import TileEntity from '../components/TileEntity';
import NetworkedObject from '../components/networking/NetworkedObject';

interface PlayerSnapshot {
  center: Coordinates;
  vel: Coordinates;
  worldId: string;
}

const player: NetworkedPrefab<PlayerSnapshot> = {
  type: 'player',

  createComponents: () => {
    return [
      new Player(),
      new Physical({
        center: { x: 120, y: 120 },
      }),
      new PolygonRenderer({ fillStyle: 'cyan' }),
      PolygonCollider.createBox({ width: 16, height: 16 }),
      new TileEntity(),
    ];
  },

  serialize: (obj: GameObject): PlayerSnapshot => {
    const phys = obj.getComponent(Physical);
    const tileEntity = obj.getComponent(TileEntity);
    const world = tileEntity.tileMap.gameObject.getComponent(NetworkedObject);
    return { center: phys.center, vel: phys.vel, worldId: world.id };
  },

  deserialize: (
    obj: GameObject,
    snapshot: PlayerSnapshot,
    objectsById: Map<string, GameObject>
  ) => {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;

    const world = objectsById.get(snapshot.worldId);

    if (!world) {
      throw new Error('missing world object');
    }

    const tileEntity = obj.getComponent(TileEntity);
    tileEntity.world = world;
  },
};

export default player;
