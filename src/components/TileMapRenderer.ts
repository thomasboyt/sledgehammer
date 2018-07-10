import { Component, Physical } from 'pearl';
import TileMap from './TileMap';
import createCachedRender from '../util/createCachedRender';
import { Tile } from '../types';
import { WIDTH, HEIGHT } from '../constants';

export default class TileMapRenderer extends Component<null> {
  wallColor?: string;

  get tileMap(): TileMap<Tile> {
    const tileMap = this.getComponent(TileMap);
    return tileMap as TileMap<Tile>;
  }

  // TODO: maybe move this util inside this.pearl.renderer or something? so can
  // access width/height. tricky bit is this.pearl isn't set until init so need
  // to be able to defer creation until later maybe a good use for annotations?
  renderTiles = createCachedRender(
    WIDTH,
    HEIGHT,
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = this.wallColor!;

      const { tileSize } = this.tileMap;

      this.tileMap.forEachTile(({ x, y }, value) => {
        if (value === Tile.Wall) {
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      });
    }
  );

  render(ctx: CanvasRenderingContext2D) {
    const pos = this.getComponent(Physical).center;
    ctx.translate(pos.x, pos.y);

    // TODO: tiles is getting replaced every tick on the client...
    this.renderTiles(ctx, 1, this.tileMap.tiles);

    // render borders, same color as BG, around edges, to prevent displaying
    // wrapped entities
    const { tileSize, worldSize } = this.tileMap;
    const width = worldSize!.x * tileSize;
    const height = worldSize!.y * tileSize;
    ctx.fillRect(0, -tileSize, width, tileSize);
    ctx.fillRect(0, height, width, tileSize);
    ctx.fillRect(-tileSize, 0, tileSize, width);
    ctx.fillRect(width, 0, tileSize, height);
  }
}
