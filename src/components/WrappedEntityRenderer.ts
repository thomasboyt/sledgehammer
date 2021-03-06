import { Component, Physical, ShapeCollider } from 'pearl';

interface Opts {
  worldWidth: number;
  worldHeight: number;
}

export default class WrappedEntityRenderer extends Component<Opts> {
  worldWidth?: number;
  worldHeight?: number;

  private renderingAtCenter = false;

  create(opts: Opts) {
    this.worldWidth = opts.worldWidth;
    this.worldHeight = opts.worldHeight;
  }

  renderAtCenter(ctx: CanvasRenderingContext2D, center: [number, number]) {
    ctx.save();
    ctx.translate(center[0], center[1]);
    this.renderingAtCenter = true;
    this.entity.render(ctx);
    this.renderingAtCenter = false;
    ctx.restore();
  }

  render(ctx: CanvasRenderingContext2D) {
    const { worldWidth, worldHeight } = this;

    if (!(worldWidth && worldHeight)) {
      return;
    }

    if (this.renderingAtCenter) {
      return;
    }

    const bounds = this.entity.getComponent(ShapeCollider).getLocalBounds();

    if (bounds.xMin < 0) {
      this.renderAtCenter(ctx, [worldWidth, 0]);
    } else if (bounds.xMax > worldWidth) {
      this.renderAtCenter(ctx, [-worldWidth, 0]);
    } else if (bounds.yMin < 0) {
      this.renderAtCenter(ctx, [0, worldHeight]);
    } else if (bounds.yMax > worldHeight) {
      this.renderAtCenter(ctx, [0, -worldHeight]);
    }
  }
}
