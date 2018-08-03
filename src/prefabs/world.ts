import { GameObject } from 'pearl';
import { NetworkedPrefab, NetworkedPhysical } from 'pearl-networking';

import TileMap from '../components/TileMap';
import TileMapCollider from '../components/TileMapCollider';
import TileMapRenderer from '../components/TileMapRenderer';
import World from '../components/World';

import { ZIndex, Tile } from '../types';
import { WORLD_SIZE_HEIGHT, TILE_SIZE, HEIGHT } from '../constants';

const world: NetworkedPrefab = {
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
      new NetworkedPhysical({ center }),
      new TileMap({
        tileSize: 16,
        collisionTileTypes: [Tile.Wall],
      }),
      new TileMapRenderer(),
      new TileMapCollider(),
      new World(),
    ];
  },
};

export default world;
