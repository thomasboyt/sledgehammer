/**
 * Scale canvas for retina screens
 *
 * (eventually may also handle scaling above game size but eh)
 */
export default function scaleCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  let pixelRatio = 1;

  if (window.devicePixelRatio) {
    pixelRatio = window.devicePixelRatio;
  }

  // canvas width and height should be the pixel-scaled size
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  // the css styling should be the "logical" size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelRatio, pixelRatio);
}
