import { Component, GameObject, Keys } from 'pearl';
import NetworkingHost, { NetworkingPlayer } from './networking/NetworkingHost';
import { levelTiles } from '../levels';
import Game from './Game';
import World from './World';
import { START_COUNTDOWN_MS } from '../constants';
import Session from './Session';

export default class SessionUI extends Component<null> {
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

    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';

    const textX = this.pearl.renderer.getViewSize().x / 2;
    const textY = 450;

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

    // ctx.textAlign = 'left';
    // const pings = [...state.pings.values()].filter((ping) => !!ping).join(', ');
    // ctx.fillText(`pings: ${pings}`, 20, 460);
  }
}
