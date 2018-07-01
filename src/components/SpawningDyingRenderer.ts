import { Component, AnimationManager, Physical } from 'pearl';
import { lerp, getRandomInt, getVectorComponents } from '../util/math';

interface Pixel {
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  rgb: [number, number, number];
}

const SPAWN_TIME_MS = 1000;
const DIE_TIME_MS = 1000;

export default class SpawningDyingRenderer extends Component<null> {
  private _state: 'spawning' | 'dying' | null = null;
  private _timeElapsedMs = 0;
  private _targetTimeMs = 0;

  private _pixels: Pixel[] = [];
  private _onFinishCb?: () => void;

  private startAnimation(targetTime: number) {
    this.isVisible = true;
    this._timeElapsedMs = 0;
    this._targetTimeMs = targetTime;
    this._pixels = [];

    const anim = this.getComponent(AnimationManager);
    anim.isVisible = false;
    const sprite = anim.getSprite();

    let canvas: HTMLCanvasElement = sprite.canvas;

    if (anim.masked) {
      // TODO: I don't like the indirection here, maybe add like
      // animationManager.getCanvas()
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
      const rgb: [number, number, number] = [
        imageData.data[i],
        imageData.data[i + 1],
        imageData.data[i + 2],
      ];

      const alpha = imageData.data[i + 3];

      if (alpha > 0) {
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
        const len = getRandomInt(0, 25);
        const startPoint = getVectorComponents(len, angleFromCenter);

        this._pixels.push({
          startX: startPoint.x,
          startY: startPoint.y,
          destX: pixelX,
          destY: pixelY,
          rgb,
        });
      }
    }
  }

  spawn(cb?: () => void) {
    this._state = 'spawning';
    this._onFinishCb = cb;
    this.startAnimation(SPAWN_TIME_MS);
  }

  die(cb?: () => void) {
    this._state = 'dying';
    this._onFinishCb = cb;
    this.startAnimation(DIE_TIME_MS);
  }

  update(dt: number) {
    if (!this._state) {
      return;
    }

    this._timeElapsedMs += dt;

    if (this._timeElapsedMs > this._targetTimeMs) {
      this._onFinish();
    }
  }

  private _onFinish() {
    if (this._state === 'spawning') {
      this.getComponent(AnimationManager).isVisible = true;
    }

    this._state = null;
    this.isVisible = false;

    if (this._onFinishCb) {
      this._onFinishCb();
    }
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
      let f = this._timeElapsedMs / this._targetTimeMs;

      if (this._state === 'dying') {
        f = 1 - f;
      }

      const x = lerp(pixel.startX, pixel.destX - width / 2, f);
      const y = lerp(pixel.startY, pixel.destY - height / 2, f);
      const alpha = f;
      const rgba = [...pixel.rgb, alpha];
      ctx.fillStyle = `rgba(${rgba.join(',')})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
