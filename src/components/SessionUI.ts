import { Component } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import Game from './Game';
import { WIDTH, TILE_SIZE, WORLD_SIZE_HEIGHT } from '../constants';
import Session from './Session';
import NetworkingClient from './networking/NetworkingClient';

export default class SessionUI extends Component<null> {
  private getLocalPlayerId(): number {
    // TODO: make this a generic util that lives on... idk, game?
    const networking = (this.pearl.obj.maybeGetComponent(NetworkingHost) ||
      this.pearl.obj.maybeGetComponent(NetworkingClient))!;

    return networking.localPlayerId!;
  }

  renderScores(ctx: CanvasRenderingContext2D) {
    ctx.save();

    ctx.textBaseline = 'top';
    ctx.font = '24px "1980XX", monospace';
    const y = 48;

    const players = this.getComponent(Session).players;

    const localPlayerId = this.getLocalPlayerId();

    for (let player of players) {
      const centerX = (WIDTH / 4) * player.slot - WIDTH / 8;

      const colorStyle = `rgb(${player.color.join(',')})`;

      if (player.id === localPlayerId) {
        ctx.fillStyle = colorStyle;
        ctx.fillRect(centerX - WIDTH / 8 + 8, y - 5, WIDTH / 4 - 16, 48);
        ctx.fillStyle = 'black';
      } else {
        ctx.fillStyle = colorStyle;
      }

      ctx.fillText(`PLAYER ${player.slot}`, centerX, y);
      ctx.fillText(`${player.score}`, centerX, y + 20);
    }

    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D) {
    // translate UI opposite translation done to center game grid
    const viewCenter = this.pearl.renderer.getViewCenter();
    const viewSize = this.pearl.renderer.getViewSize();
    const pos = {
      x: viewCenter.x - viewSize.x / 2,
      y: viewCenter.y - viewSize.y / 2,
    };
    ctx.translate(pos.x, pos.y);

    const { isHost } = this.pearl.obj.getComponent(Game);
    const { gameState, startTime } = this.getComponent(Session);

    ctx.font = '32px "1980XX", monospace';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'center';

    this.renderScores(ctx);

    ctx.translate(0, -pos.y);

    const textX = this.pearl.renderer.getViewSize().x / 2;
    const textY = (WORLD_SIZE_HEIGHT / 2) * TILE_SIZE - 2;
    ctx.textBaseline = 'middle';

    let text: string | undefined;

    if (gameState === 'waiting') {
      if (isHost) {
        text = `SLEDGEHAMMER\npress space to start`;
      } else {
        text = 'SLEDGEHAMMER\nwaiting for host\nto start game...';
      }
    } else if (gameState === 'starting') {
      text = `${Math.ceil((startTime! - Date.now()) / 1000)}...`;
    } else if (gameState === 'cleared') {
      text = 'you won!';
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
