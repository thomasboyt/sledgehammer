import GameState, { Player, Bullet, Tile } from './GameState';
import { WIDTH, HEIGHT, TILE_SIZE, WORLD_SIZE_WIDTH } from './constants';
import { stat } from 'fs';
import createCachedRender from './util/createCachedRender';

function renderPlayer(ctx: CanvasRenderingContext2D, player: Player) {
  // drawing the player works like this:
  // 1. move to center of player
  // 2. draw equillateral triangle around center
  // 3. rotate by angle based on current vector

  ctx.save();
  ctx.translate(player.center[0], player.center[1]);
  ctx.rotate(player.angle);

  ctx.fillStyle = player.color;

  ctx.beginPath();
  ctx.moveTo(-player.width / 2, -player.height / 2);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.lineTo(player.width / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = player.color;
  ctx.strokeRect(
    player.center[0] - player.width / 2,
    player.center[1] - player.height / 2,
    player.width,
    player.height
  );
}

function renderBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  ctx.save();
  ctx.translate(bullet.center[0], bullet.center[1]);
  ctx.rotate(bullet.angle);

  ctx.fillStyle = 'limegreen';
  ctx.fillRect(
    -bullet.width / 2,
    -bullet.height / 2,
    bullet.width,
    bullet.height
  );
  ctx.restore();
}

const renderTiles = createCachedRender(
  WIDTH,
  HEIGHT,
  (ctx: CanvasRenderingContext2D, tiles: Tile[][]) => {
    ctx.fillStyle = 'yellow';

    for (let y = 0; y < tiles.length; y += 1) {
      const tileRow = tiles[y];
      for (let x = 0; x < tileRow.length; x += 1) {
        const tile = tileRow[x];
        if (tile === 'wall') {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
);

export default function render(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();

  // center world
  const worldWidth = WORLD_SIZE_WIDTH * TILE_SIZE;
  const leftMargin = (WIDTH - worldWidth) / 2;
  const topMargin = 10; // arbitrary obvs

  ctx.translate(leftMargin, topMargin);

  renderTiles(ctx, 1, state.level.tiles);

  for (let player of state.players.values()) {
    renderPlayer(ctx, player);
  }

  for (let bullet of state.bullets) {
    renderBullet(ctx, bullet);
  }

  ctx.restore();
}
