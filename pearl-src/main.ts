import { Component, createPearl } from 'pearl';

class HelloWorld extends Component<null> {
  render(ctx: CanvasRenderingContext2D) {
    ctx.font = '16px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';

    ctx.fillText('Hello world!', 150, 150);
  }
}

createPearl({
  rootComponents: [new HelloWorld()],
  width: 640,
  height: 480,
  canvas: document.getElementById('game') as HTMLCanvasElement,
});
