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
    ctx.fillRect(
      player.box.center[0] - player.box.width / 2,
      player.box.center[1] - player.box.height / 2,
      player.box.width,
      player.box.height
    );
  }
}
