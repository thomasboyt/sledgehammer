import { Component, PolygonRenderer } from 'pearl';

export default class Pickup extends Component<null> {
  init() {
    this.runCoroutine(function*(this: Pickup) {
      const renderer = this.getComponent(PolygonRenderer);

      while (true) {
        renderer.isVisible = false;
        yield this.pearl.async.waitMs(300);
        renderer.isVisible = true;
        yield this.pearl.async.waitMs(500);
      }
    });
  }
}
