import GameState, { Player, Bullet, Tile, Entity, Enemy } from './GameState';
import {
  WIDTH,
  HEIGHT,
  TILE_SIZE,
  WORLD_SIZE_WIDTH,
  WORLD_SIZE_HEIGHT,
} from './constants';
import { stat } from 'fs';
import createCachedRender from './util/createCachedRender';

function renderPlayer(ctx: CanvasRenderingContext2D, player: Player) {
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

  ctx.fillStyle = player.color;

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
    renderWrappingEntity(ctx, player, () => renderPlayer(ctx, player));

    ctx.strokeStyle = player.color;
    ctx.strokeRect(
      player.center[0] - player.width / 2,
      player.center[1] - player.height / 2,
      player.width,
      player.height
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
  const pings = [...state.players.values()]
    .map((player) => player.ping)
    .filter((ping) => !!ping)
    .join(', ');
  ctx.fillText(`pings: ${pings}`, 20, 460);
}
