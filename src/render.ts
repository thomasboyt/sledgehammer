import GameState from './GameState';

const WIDTH = 640;
const HEIGHT = 480;

export default function render(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let player of state.players.values()) {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.pos[0], player.pos[1], 20, 20);
  }
}
