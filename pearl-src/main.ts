import { createPearl } from 'pearl';

import { WIDTH, HEIGHT } from '../src/constants';
import Game from './components/Game';

createPearl({
  rootComponents: [new Game()],
  width: WIDTH,
  height: HEIGHT,
  canvas: document.getElementById('game') as HTMLCanvasElement,
});
