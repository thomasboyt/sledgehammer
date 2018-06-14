import {
  Component,
  GameObject,
  PolygonRenderer,
  PolygonCollider,
  Physical,
} from 'pearl';

import Player from './Player';

export default class Game extends Component<null> {
  init() {
    const player = new GameObject({
      name: 'player',
      components: [
        new Player(),
        new Physical({
          center: { x: 120, y: 120 },
        }),
        new PolygonRenderer({ fillStyle: 'cyan' }),
        PolygonCollider.createBox({ width: 16, height: 16 }),
      ],
    });

    this.pearl.entities.add(player);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'black';
    const size = this.pearl.renderer.getViewSize();
    ctx.fillRect(0, 0, size.x, size.y);
  }
}
