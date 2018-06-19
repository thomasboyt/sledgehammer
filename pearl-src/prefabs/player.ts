import {
  Physical,
  PolygonRenderer,
  PolygonCollider,
  Coordinates,
  GameObject,
  AnimationManager,
  SpriteSheet,
} from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';

import AssetManager from '../components/AssetManager';
import Player from '../components/Player';
import TileEntity from '../components/TileEntity';
import NetworkedObject from '../components/networking/NetworkedObject';
import WrappedEntityRenderer from '../components/WrappedEntityRenderer';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';

interface PlayerSnapshot {
  center: Coordinates;
  vel: Coordinates;
  angle: number;

  worldId: string;

  animationState: string;
  animationScaleX: number;
  animationScaleY: number;
}

const player: NetworkedPrefab<PlayerSnapshot> = {
  type: 'player',

  createComponents(pearl) {
    return [
      new Physical({
        center: { x: 120, y: 120 },
      }),
      new PolygonRenderer({ strokeStyle: 'cyan' }),
      PolygonCollider.createBox({ width: 16, height: 16 }),
      new TileEntity(),
      new WrappedEntityRenderer({
        // TODO: would be nice if this came from TileMap or world somehow...
        worldWidth: TILE_SIZE * WORLD_SIZE_WIDTH,
        worldHeight: TILE_SIZE * WORLD_SIZE_HEIGHT,
      }),

      new AnimationManager({
        // TODO: cache this?
        sheet: pearl.obj
          .getComponent(AssetManager)
          .getSpriteSheet('player', TILE_SIZE, TILE_SIZE),

        initialState: 'idle',

        animations: {
          idle: {
            frames: [0],
            frameLengthMs: null,
          },
          walking: {
            frames: [0, 1],
            frameLengthMs: 200,
          },
        },
      }),

      new Player(),
    ];
  },

  serialize: (obj: GameObject): PlayerSnapshot => {
    const phys = obj.getComponent(Physical);
    const tileEntity = obj.getComponent(TileEntity);
    const world = tileEntity.tileMap.gameObject.getComponent(NetworkedObject);
    const anim = obj.getComponent(AnimationManager);
    return {
      center: phys.center,
      vel: phys.vel,
      angle: phys.angle,

      worldId: world.id,

      animationState: anim.current,
      animationScaleX: anim.scaleX,
      animationScaleY: anim.scaleY,
    };
  },

  deserialize: (
    obj: GameObject,
    snapshot: PlayerSnapshot,
    objectsById: Map<string, GameObject>
  ) => {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;
    phys.angle = snapshot.angle;

    const world = objectsById.get(snapshot.worldId);

    if (!world) {
      throw new Error('missing world object');
    }

    const tileEntity = obj.getComponent(TileEntity);
    tileEntity.world = world;

    const anim = obj.getComponent(AnimationManager);
    anim.set(snapshot.animationState);
    anim.scaleX = snapshot.animationScaleX;
    anim.scaleY = snapshot.animationScaleY;
  },
};

export default player;
