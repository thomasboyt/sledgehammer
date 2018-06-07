import {
  SnapshotState,
  Player,
  Bullet,
  Tile,
  Entity,
  Enemy,
} from './GameState';
import {
  WIDTH,
  HEIGHT,
  TILE_SIZE,
  WORLD_SIZE_WIDTH,
  WORLD_SIZE_HEIGHT,
} from './constants';
import createCachedRender from './util/createCachedRender';

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isLocalPlayer: boolean
) {
  // drawing the player works like this:
  // 1. move to center of player
  // 2. draw equillateral triangle around center
  // 3. rotate by angle based on current vector

  ctx.save();

  let angle = Math.atan(player.facing[1] / player.facing[0]);
  if (player.facing[0] < 0) {
    angle += Math.PI;
  }
  ctx.rotate(angle);

  ctx.fillStyle = isLocalPlayer ? 'red' : 'cyan';

  ctx.beginPath();
  ctx.moveTo(-player.width / 2, -player.height / 2);
  ctx.lineTo(-player.width / 2, player.height / 2);
  ctx.lineTo(player.width / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function renderWrappingEntity(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  render: () => void
) {
  const renderAtCenter = (center: [number, number]) => {
    ctx.save();
    ctx.translate(center[0], center[1]);
    render();
    ctx.restore();
  };

  renderAtCenter(entity.center);

  const worldWidth = WORLD_SIZE_WIDTH * TILE_SIZE;
  const worldHeight = WORLD_SIZE_HEIGHT * TILE_SIZE;

  if (entity.center[0] - entity.width / 2 < 0) {
    renderAtCenter([entity.center[0] + worldWidth, entity.center[1]]);
  } else if (entity.center[0] + entity.width / 2 > worldWidth) {
    renderAtCenter([entity.center[0] - worldWidth, entity.center[1]]);
  } else if (entity.center[1] - entity.height / 2 < 0) {
    renderAtCenter([entity.center[0], entity.center[1] + worldHeight]);
  } else if (entity.center[1] + entity.height / 2 > worldHeight) {
    renderAtCenter([entity.center[0], entity.center[1] - worldHeight]);
  }
}

function renderBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  ctx.save();
  ctx.translate(bullet.center[0], bullet.center[1]);

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

function renderEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  ctx.save();

  let angle = Math.atan(enemy.facing[1] / enemy.facing[0]);
  if (enemy.facing[0] < 0) {
    angle += Math.PI;
  }
  ctx.rotate(angle);

  ctx.fillStyle = 'pink';

  ctx.beginPath();
  ctx.moveTo(-enemy.width / 2, -enemy.height / 2);
  ctx.lineTo(-enemy.width / 2, enemy.height / 2);
  ctx.lineTo(enemy.width / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  state: SnapshotState;
  localPlayerId: number;
  isHost: boolean;
}

export default function render(opts: RenderOptions) {
  const { ctx, state, localPlayerId, isHost } = opts;

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

  for (let [playerId, player] of state.players.entries()) {
    const isLocalPlayer = playerId === localPlayerId;
    renderWrappingEntity(ctx, player, () =>
      renderPlayer(ctx, player, isLocalPlayer)
    );
  }

  for (let bullet of state.bullets) {
    renderBullet(ctx, bullet);
  }

  for (let enemy of state.enemies) {
    renderWrappingEntity(ctx, enemy, () => renderEnemy(ctx, enemy));
  }

  ctx.restore();

  ctx.fillStyle = 'white';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';

  if (state.status === 'waiting') {
    const text = isHost
      ? 'press space to start'
      : 'waiting for host to start game...';
    ctx.fillText(text, WIDTH / 2, 420);
  } else if (state.status === 'starting') {
    const text = `${Math.ceil((state.startTime! - Date.now()) / 1000)}...`;
    ctx.fillText(text, WIDTH / 2, 420);
  } else if (state.status === 'cleared') {
    const text = 'you won!';
    ctx.fillText(text, WIDTH / 2, 420);
  } else if (state.status === 'gameOver') {
    const text = isHost ? 'game over :( press R to retry' : 'game over :(';
    ctx.fillText(text, WIDTH / 2, 420);
  }

  ctx.textAlign = 'left';
  const pings = [...state.pings.values()].filter((ping) => !!ping).join(', ');
  ctx.fillText(`pings: ${pings}`, 20, 460);
}
