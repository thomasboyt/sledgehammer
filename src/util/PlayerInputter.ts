// inspired, like many bits of code, by coquette.js:
// https://github.com/maryrosecook/coquette/blob/master/src/inputter.js

import keyCodes, { interruptKeyCodes } from './keyCodes';

export default class PlayerInputter {
  keysDown = new Set<number>();
  private newKeysPressed = new Set<number>();
  private allKeysPressed = new Set<number>();

  getKeysPressedAndClear(): Set<number> {
    const pressed = new Set(this.newKeysPressed);
    this.newKeysPressed.clear();
    return pressed;
  }

  registerLocalListeners() {
    window.addEventListener('keydown', (e) => {
      this.onKeyDown(e.keyCode);

      if (interruptKeyCodes.has(e.keyCode)) {
        e.preventDefault();
        return false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.onKeyUp(e.keyCode);
    });
  }

  onKeyDown(keyCode: number) {
    this.keysDown.add(keyCode);
    if (!this.allKeysPressed.has(keyCode)) {
      this.allKeysPressed.add(keyCode);
      this.newKeysPressed.add(keyCode);
    }
  }

  onKeyUp(keyCode: number) {
    this.keysDown.delete(keyCode);
    this.allKeysPressed.delete(keyCode);
    this.newKeysPressed.delete(keyCode);
  }
}
