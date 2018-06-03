import GameState, { Player, Bullet } from './GameState';
import { WIDTH, HEIGHT, TILE_SIZE } from './constants';
import { stat } from 'fs';

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

export default function render(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < state.level.tiles.length; y += 1) {
    const tileRow = state.level.tiles[y];
    for (let x = 0; x < tileRow.length; x += 1) {
      const tile = tileRow[x];
      if (tile === 'wall') {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(x * 20, y * 20, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  for (let player of state.players.values()) {
    renderPlayer(ctx, player);
  }

  for (let bullet of state.bullets) {
    renderBullet(ctx, bullet);
  }
}
