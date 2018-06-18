import {
  Component,
  GameObject,
  PolygonRenderer,
  PolygonCollider,
  Physical,
  Coordinates,
} from 'pearl';

import { NetworkedPrefab } from './components/networking/Networking';

import Player, { PlayerSnapshot } from './components/Player';
import TileMap from './components/TileMap';
import TileEntity from './components/TileEntity';
import NetworkedObject from './components/networking/NetworkedObject';
import TileMapRenderer from './components/TileMapRenderer';
import World from './components/World';
import Bullet from './components/Bullet';
import BulletExplosion from './components/BulletExplosion';

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

interface BulletSnapshot {
  center: Coordinates;
  vel: Coordinates;
}

const bullet: NetworkedPrefab<BulletSnapshot> = {
  type: 'bullet',

  createComponents: () => {
    return [
      new Bullet(),
      new Physical({
        center: { x: 0, y: 0 },
      }),
      new PolygonRenderer({ fillStyle: 'pink' }),
      PolygonCollider.createBox({ width: 6, height: 6 }),
    ];
  },

  serialize(obj) {
    const phys = obj.getComponent(Physical);
    return { center: phys.center, vel: phys.vel };
  },

  deserialize(obj, snapshot) {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;
  },
};

interface BulletExplosionSnapshot {
  center: Coordinates;
}

const bulletExplosion: NetworkedPrefab<BulletExplosionSnapshot> = {
  type: 'bullet',

  zIndex: 1,

  createComponents: () => {
    return [
      new BulletExplosion(),
      new Physical({
        center: { x: 0, y: 0 },
      }),
    ];
  },

  serialize(obj) {
    const phys = obj.getComponent(Physical);
    return { center: phys.center };
  },

  deserialize(obj, snapshot) {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    const explosion = obj.getComponent(BulletExplosion);

    if (!explosion.initialized) {
      explosion.start();
    }
  },
};

export default {
  player,
  world,
  bullet,
  bulletExplosion,
};
