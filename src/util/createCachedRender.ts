function getPixelRatio() {
  return window.devicePixelRatio ? window.devicePixelRatio : 1;
}

export class OffscreenCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  constructor(width: number, height: number, scaleFactor: number) {
    const pixelRatio = getPixelRatio();
    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas') as HTMLCanvasElement;
    this.canvas.width = width * scaleFactor * pixelRatio;
    this.canvas.height = height * scaleFactor * pixelRatio;

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(scaleFactor * pixelRatio, scaleFactor * pixelRatio);
  }

  /*
   * Okay so this is super confusing but: we have to render this at the
   * "internal" resolution so it can be later scaled UP to the "native"
   * resolution
   */
  render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.canvas, 0, 0, this.width, this.height);
  }
}

/*
 * Creates a cached reducer that renders to an offscreen canvas. Does a naive
 * equality check on passed args, so works well with immutable state. Also will
 * always re-render if scaleFactor changes.
 */
export default function createCachedRender(
  width: number,
  height: number,
  fn: (ctx: CanvasRenderingContext2D, ...args: any[]) => void
) {
  let prevScaleFactor: number | null = null;
  let prevArgs: any[] = [];
  let prevCanvas: OffscreenCanvas | null = null;

  return (
    ctx: CanvasRenderingContext2D,
    scaleFactor: number,
    ...args: any[]
  ) => {
    let shouldRecompute = false;

    if (scaleFactor !== prevScaleFactor) {
      prevScaleFactor = scaleFactor;
      shouldRecompute = true;
    } else {
      for (let idx in args) {
        if (args[idx] !== prevArgs[idx]) {
          shouldRecompute = true;
          break;
        }
      }
    }

    if (shouldRecompute || !prevCanvas) {
      prevCanvas = new OffscreenCanvas(width, height, scaleFactor);
      prevArgs = args;
      fn(prevCanvas.ctx, ...args);
    }

    prevCanvas.render(ctx);
  };
}
