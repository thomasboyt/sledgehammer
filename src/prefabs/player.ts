import {
  BoxCollider,
  Coordinates,
  GameObject,
  AnimationManager,
  SpriteRenderer,
} from 'pearl';
import { NetworkedPhysical, NetworkedPrefab } from 'pearl-networking';

import AssetManager from '../components/AssetManager';
import Player from '../components/Player';
import TileEntity from '../components/TileEntity';
import WrappedEntityRenderer from '../components/WrappedEntityRenderer';
import SpawningDyingRenderer from '../components/SpawningDyingRenderer';
import NetworkedAnimationManager from '../components/NetworkedAnimationManager';

import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';
import { ZIndex } from '../types';
import SpriteSheetAsset from '../SpriteSheetAsset';

const player: NetworkedPrefab = {
  type: 'player',

  zIndex: ZIndex.Pickup,

  createComponents(pearl) {
    return [
      new NetworkedPhysical({
        center: { x: 120, y: 120 },
      }),
      new BoxCollider({
        width: TILE_SIZE - 2,
        height: TILE_SIZE - 2,
      }),
      new TileEntity(),
      new WrappedEntityRenderer({
        // TODO: would be nice if this came from TileMap or world somehow...
        worldWidth: TILE_SIZE * WORLD_SIZE_WIDTH,
        worldHeight: TILE_SIZE * WORLD_SIZE_HEIGHT,
      }),

      new NetworkedAnimationManager({
        sheet: pearl.assets.get(SpriteSheetAsset, 'player'),

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

      new SpriteRenderer(),
      new Player(),
      new SpawningDyingRenderer(),
    ];
  },
};

export default player;
