import GameState from './GameState';
import { WIDTH, HEIGHT, TILE_SIZE } from './constants';

export default function render(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let player of state.players.values()) {
    ctx.fillStyle = player.color;
    ctx.fillRect(
      player.box.center[0] - player.box.width / 2,
      player.box.center[1] - player.box.height / 2,
      player.box.width,
      player.box.height
    );
  }

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
}
