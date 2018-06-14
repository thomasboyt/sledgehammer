import { Component, Physical, Keys } from 'pearl';

const MOVE_SPEED = 0.1;

export default class Player extends Component<null> {
  update(dt: number) {
    // todo
    // if (host) {
    //   compute player update
    // } else if (client) {
    //   send player keystrokes to host?
    // }
    const phys = this.getComponent(Physical);
    phys.vel = { x: 0, y: 0 };

    if (this.pearl.inputter.isKeyDown(Keys.rightArrow)) {
      phys.vel.x = 1 * MOVE_SPEED;
    }
  }
}
