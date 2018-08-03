import {
  Physical,
  BoxCollider,
  Coordinates,
  GameObject,
  AnimationManager,
  SpriteRenderer,
} from 'pearl';
import { NetworkedPrefab } from '../networking/components/Networking';

import AssetManager from '../components/AssetManager';
import Player from '../components/Player';
import TileEntity from '../components/TileEntity';
import NetworkedObject from '../networking/components/NetworkedObject';
import WrappedEntityRenderer from '../components/WrappedEntityRenderer';
import SpawningDyingRenderer from '../components/SpawningDyingRenderer';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';

import {
  serializeAnimationManager,
  deserializeAnimationManager,
  AnimationSnapshot,
} from '../serializers/serializeAnimationManager';
import { ZIndex } from '../types';
import SpriteSheetAsset from '../SpriteSheetAsset';

interface PlayerSnapshot {
  center: Coordinates;
  angle: number;

  worldId: string;
  playerState: string;
  playerId?: number;
  color: [number, number, number];

  animation: AnimationSnapshot;
}

const player: NetworkedPrefab<PlayerSnapshot> = {
  type: 'player',

  zIndex: ZIndex.Pickup,

  createComponents(pearl) {
    return [
      new Physical({
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

      new AnimationManager({
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

  serialize: (obj: GameObject): PlayerSnapshot => {
    const phys = obj.getComponent(Physical);
    const tileEntity = obj.getComponent(TileEntity);
    const world = tileEntity.tileMap.gameObject.getComponent(NetworkedObject);
    const player = obj.getComponent(Player);
    const anim = obj.getComponent(AnimationManager);
    const renderer = obj.getComponent(SpriteRenderer);

    return {
      center: phys.center,
      angle: phys.angle,

      worldId: world.id,

      playerState: player.playerState,
      playerId: player.playerId,
      color: player.color!,

      animation: serializeAnimationManager(anim, renderer),
    };
  },

  deserialize: (
    obj: GameObject,
    snapshot: PlayerSnapshot,
    objectsById: Map<string, GameObject>
  ) => {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.angle = snapshot.angle;

    const world = objectsById.get(snapshot.worldId);

    if (!world) {
      throw new Error('missing world object');
    }

    const tileEntity = obj.getComponent(TileEntity);
    tileEntity.world = world;

    const player = obj.getComponent(Player);
    player.playerState = snapshot.playerState;
    player.playerId = snapshot.playerId;
    player.color = snapshot.color;

    const anim = obj.getComponent(AnimationManager);
    const renderer = obj.getComponent(SpriteRenderer);
    deserializeAnimationManager(anim, renderer, snapshot.animation);
  },
};

export default player;
