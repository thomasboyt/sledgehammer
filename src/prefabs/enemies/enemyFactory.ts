import { Component, Physical, PolygonCollider, AnimationManager } from 'pearl';
import { NetworkedPrefab } from '../../components/networking/Networking';

import TileEntity from '../../components/TileEntity';
import WrappedEntityRenderer from '../../components/WrappedEntityRenderer';
import {
  TILE_SIZE,
  WORLD_SIZE_WIDTH,
  WORLD_SIZE_HEIGHT,
} from '../../constants';
import AssetManager from '../../components/AssetManager';
import {
  AnimationSnapshot,
  serializeAnimationManager,
  deserializeAnimationManager,
} from '../../serializers/serializeAnimationManager';
import {
  PhysicalSnapshot,
  serializePhysical,
  deserializePhysical,
} from '../../serializers/serializePhysical';
import BaseEnemy from '../../components/enemies/BaseEnemy';
import { ZIndex } from '../../types';
import SpawningDyingRenderer from '../../components/SpawningDyingRenderer';

interface EnemySnapshot {
  physical: PhysicalSnapshot;
  animation: AnimationSnapshot;
}

interface FactoryOptions {
  type: string;
  EnemyComponent: typeof BaseEnemy;
  spriteSheet: string;
}

function enemyFactory(opts: FactoryOptions): NetworkedPrefab<EnemySnapshot> {
  return {
    type: opts.type,
    tags: ['enemy'],
    zIndex: ZIndex.Enemy,

    createComponents: (pearl) => {
      return [
        new Physical({
          center: { x: 120, y: 120 },
        }),
        new TileEntity(),
        new WrappedEntityRenderer({
          // TODO: would be nice if this came from TileMap or world somehow...
          worldWidth: TILE_SIZE * WORLD_SIZE_WIDTH,
          worldHeight: TILE_SIZE * WORLD_SIZE_HEIGHT,
        }),
        PolygonCollider.createBox({
          width: TILE_SIZE - 2,
          height: TILE_SIZE - 2,
        }),
        new AnimationManager({
          sheet: pearl.obj
            .getComponent(AssetManager)
            .getSpriteSheet(opts.spriteSheet, 8, 8),

          initialState: 'walking',

          animations: {
            walking: {
              frames: [0, 1],
              frameLengthMs: 200,
            },
          },
        }),
        new opts.EnemyComponent(),
        new SpawningDyingRenderer(),
      ];
    },

    serialize: (obj) => {
      const phys = obj.getComponent(Physical);
      const anim = obj.getComponent(AnimationManager);

      return {
        physical: serializePhysical(phys),
        animation: serializeAnimationManager(anim),
      };
    },

    deserialize: (obj, snapshot, objectsById) => {
      const phys = obj.getComponent(Physical);
      deserializePhysical(phys, snapshot.physical);

      const anim = obj.getComponent(AnimationManager);
      deserializeAnimationManager(anim, snapshot.animation);
    },
  };
}

export default enemyFactory;
