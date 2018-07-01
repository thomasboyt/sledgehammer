import { Component } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import Game from './Game';
import { WIDTH } from '../constants';
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
    const y = 400; // nice

    const players = this.getComponent(Session).players;

    const localPlayerId = this.getLocalPlayerId();

    for (let player of players) {
      const centerX = (WIDTH / 4) * player.slot - WIDTH / 8;

      const colorStyle = `rgb(${player.color.join(',')})`;

      if (player.id === localPlayerId) {
        ctx.fillStyle = colorStyle;
        ctx.fillRect(centerX - WIDTH / 8 + 8, y - 5, WIDTH / 4 - 16, 50);
        ctx.fillStyle = 'black';
      } else {
        ctx.fillStyle = colorStyle;
      }

      ctx.fillText(`player ${player.slot}`, centerX, y);
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

    ctx.font = '16px monospace';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    const textX = this.pearl.renderer.getViewSize().x / 2;
    const textY = 470;

    this.renderScores(ctx);

    if (gameState === 'waiting') {
      let text: string;

      if (isHost) {
        const connected = this.pearl.obj.getComponent(NetworkingHost).players
          .size;
        text = `press space to start (${connected} connected)`;
      } else {
        text = 'waiting for host to start game...';
      }

      ctx.fillText(text, textX, textY);
    } else if (gameState === 'starting') {
      const text = `${Math.ceil((startTime! - Date.now()) / 1000)}...`;
      ctx.fillText(text, textX, textY);
    } else if (gameState === 'cleared') {
      const text = 'you won!';
      ctx.fillText(text, textX, textY);
    } else if (gameState === 'gameOver') {
      const text = isHost ? 'game over :( press R to retry' : 'game over :(';
      ctx.fillText(text, textX, textY);
    }
  }
}
