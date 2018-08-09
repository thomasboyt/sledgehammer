import { Physical, SpriteRenderer, BoxCollider } from 'pearl';
import { NetworkedPrefab, NetworkedPhysical } from 'pearl-networking';

import TileEntity from '../../components/TileEntity';
import WrappedEntityRenderer from '../../components/WrappedEntityRenderer';
import {
  TILE_SIZE,
  WORLD_SIZE_WIDTH,
  WORLD_SIZE_HEIGHT,
} from '../../constants';
import BaseEnemy from '../../components/enemies/BaseEnemy';
import { ZIndex } from '../../types';
import SpawningDyingRenderer from '../../components/SpawningDyingRenderer';
import SpriteSheetAsset from '../../SpriteSheetAsset';
import NetworkedAnimationManager from '../../components/NetworkedAnimationManager';

interface FactoryOptions {
  type: string;
  EnemyComponent: typeof BaseEnemy;
  spriteSheet: string;
}

function enemyFactory(opts: FactoryOptions): NetworkedPrefab {
  return {
    type: opts.type,
    tags: ['enemy'],
    zIndex: ZIndex.Enemy,

    createComponents: (pearl) => {
      return [
        new NetworkedPhysical({
          center: { x: 120, y: 120 },
        }),
        new TileEntity(),
        new WrappedEntityRenderer({
          // TODO: would be nice if this came from TileMap or world somehow...
          worldWidth: TILE_SIZE * WORLD_SIZE_WIDTH,
          worldHeight: TILE_SIZE * WORLD_SIZE_HEIGHT,
        }),
        new BoxCollider({
          width: TILE_SIZE - 2,
          height: TILE_SIZE - 2,
        }),
        new NetworkedAnimationManager({
          sheet: pearl.assets.get(SpriteSheetAsset, opts.spriteSheet),

          initialState: 'walking',

          animations: {
            walking: {
              frames: [0, 1],
              frameLengthMs: 200,
            },
          },
        }),
        new SpriteRenderer(),
        new opts.EnemyComponent(),
        new SpawningDyingRenderer(),
      ];
    },
  };
}

export default enemyFactory;
