import scaleCanvas from './util/scaleCanvas';
import { HEIGHT, WIDTH } from './constants';

export function setupCanvas(selector: string): HTMLCanvasElement {
  const canvas: HTMLCanvasElement | null = document.querySelector(selector);

  if (!(canvas && canvas.nodeName === 'CANVAS')) {
    throw new Error(`no canvas found matching selector ${selector}`);
  }

  scaleCanvas(canvas, WIDTH, HEIGHT);

  return canvas;
}
