import { Component } from 'pearl';
import { NetworkingHost, NetworkingClient } from 'pearl-networking';
import Game from './Game';
import { WIDTH, TILE_SIZE, WORLD_SIZE_HEIGHT, HEIGHT } from '../constants';
import Session, { SessionPlayer } from './Session';

export default class SessionUI extends Component<null> {
  private getLocalPlayer(): SessionPlayer | undefined {
    // TODO: make this a generic util that lives on... idk, session?
    const networking = (this.pearl.root.maybeGetComponent(NetworkingHost) ||
      this.pearl.root.maybeGetComponent(NetworkingClient))!;

    const id = networking.localPlayerId;

    return this.getComponent(Session).players.find(
      (player) => id === player.id
    );
  }

  renderScores(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.textBaseline = 'top';
    ctx.font = '24px "1980XX", monospace';
    const y = 48;

    const players = this.getComponent(Session).players;

    const localPlayer = this.getLocalPlayer()!;

    for (let player of players) {
      const centerX = (WIDTH / 4) * player.slot - WIDTH / 8;

      const colorStyle = `rgb(${player.color.join(',')})`;

      if (player === localPlayer) {
        ctx.fillStyle = colorStyle;
        ctx.fillRect(centerX - WIDTH / 8 + 8, y - 5, WIDTH / 4 - 16, 48);
        ctx.fillStyle = 'black';
      } else {
        ctx.fillStyle = colorStyle;
      }

      ctx.fillText(`PLAYER ${player.slot}`, centerX, y);
      ctx.fillText(`${player.score}`, centerX, y + 20);

      ctx.fillStyle = 'white';

      if (this.getComponent(Session).gameState === 'waiting') {
        if (player.isReady) {
          ctx.fillText('ready!', centerX, y + 42);
        } else {
          ctx.fillText('waiting...', centerX, y + 42);
        }
      }
    }

    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D) {
    const { isHost } = this.pearl.root.getComponent(Game);
    const { gameState, startTime, players } = this.getComponent(Session);

    ctx.font = '32px "1980XX", monospace';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'center';

    this.renderScores(ctx);

    const textX = this.pearl.renderer.getViewSize().x / 2;
    const textY = HEIGHT - (WORLD_SIZE_HEIGHT / 2) * TILE_SIZE - 2;
    ctx.textBaseline = 'middle';

    let text: string | undefined;

    const localPlayer = this.getLocalPlayer()!;

    if (gameState === 'waiting') {
      if (localPlayer.isReady) {
        text = 'SLEDGEHAMMER\nwaiting for\nplayers to ready...';
      } else {
        text = 'SLEDGEHAMMER\npress space to ready';
      }
    } else if (gameState === 'starting') {
      text = `${Math.ceil((startTime! - Date.now()) / 1000)}...`;
    } else if (gameState === 'gameOver') {
      text = isHost ? 'game over :(\npress R to retry' : 'game over :(';
    }

    if (text) {
      const lines = text.split('\n');
      const lineHeight = 20;
      const firstLineY = textY - (lines.length * lineHeight) / 2;
      ctx.translate(0, textY - ((lines.length - 1) * lineHeight) / 2);
      for (let i = 0; i < lines.length; i += 1) {
        ctx.lineWidth = 4;
        ctx.strokeText(lines[i], textX, lineHeight * i);
        ctx.fillText(lines[i], textX, lineHeight * i);
      }
    }
  }
}
