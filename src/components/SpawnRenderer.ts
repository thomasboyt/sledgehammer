import { Component, AnimationManager, Physical } from 'pearl';
import { lerp, getRandomInt, getVectorComponents } from '../util/math';
import Delegate from '../util/Delegate';

interface Pixel {
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  rgba: [number, number, number, number];
}

export default class SpawnRenderer extends Component<null> {
  spawning = true;

  onFinish = new Delegate();

  private _timeElapsedMs = 0;
  private _targetTimeMs = 1000;

  private _pixels: Pixel[] = [];

  init() {
    const anim = this.getComponent(AnimationManager);
    anim.isVisible = false;
    const sprite = anim.getSprite();

    let canvas: HTMLCanvasElement = sprite.canvas;

    if (anim.masked) {
      // TODO: I don't like the indirection here, maybe add like animationManager.getCanvas()
      canvas = document.createElement('canvas');
      canvas.width = sprite.width;
      canvas.height = sprite.height;
      sprite.drawMasked(
        canvas.getContext('2d')!,
        0,
        0,
        anim.maskFrom,
        anim.maskTo
      );
    }

    const imageData = canvas
      .getContext('2d')!
      .getImageData(0, 0, sprite.width, sprite.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const rgba: [number, number, number, number] = [
        imageData.data[i],
        imageData.data[i + 1],
        imageData.data[i + 2],
        imageData.data[i + 3],
      ];

      if (rgba[3] > 0) {
        // this is a pixel that needs to be rendered
        const pixelIdx = i / 4;
        const pixelX = pixelIdx % sprite.width;
        const pixelY = Math.floor(pixelIdx / sprite.width);

        // x, y relative to center
        const center = { x: sprite.width / 2, y: sprite.height / 2 };
        const vector = {
          x: pixelX - center.x,
          y: pixelY - center.y,
        };

        const angleFromCenter = Math.atan2(vector.y, vector.x);
        const len = getRandomInt(0, 20);
        const startPoint = getVectorComponents(len, angleFromCenter);

        this._pixels.push({
          startX: startPoint.x,
          startY: startPoint.y,
          destX: pixelX,
          destY: pixelY,
          rgba,
        });
      }
    }
  }

  update(dt: number) {
    if (!this.spawning) {
      return;
    }

    this._timeElapsedMs += dt;

    if (this._timeElapsedMs > this._targetTimeMs) {
      this._onFinish();
    }
  }

  _onFinish() {
    this.spawning = false;
    this.getComponent(AnimationManager).isVisible = true;
    this.isVisible = false;
    this.onFinish.call({});
  }

  render(ctx: CanvasRenderingContext2D) {
    const anim = this.getComponent(AnimationManager);
    const phys = this.getComponent(Physical);
    const { center, angle } = phys;

    ctx.translate(center.x, center.y);
    ctx.scale(anim.scaleX, anim.scaleY);
    ctx.rotate(angle);

    const { width, height } = anim.getSprite();

    for (let pixel of this._pixels) {
      const f = this._timeElapsedMs / this._targetTimeMs;
      const x = lerp(pixel.startX, pixel.destX - width / 2, f);
      const y = lerp(pixel.startY, pixel.destY - height / 2, f);
      ctx.fillStyle = `rgba(${pixel.rgba.join(',')})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
