import { Keys } from 'pearl';

const interruptKeyCodes = new Set([
  Keys.leftArrow,
  Keys.rightArrow,
  Keys.upArrow,
  Keys.downArrow,
  Keys.space,
]);

interface Options {
  onKeyDown?: (keyCode: number) => void;
  onKeyUp?: (keyCode: number) => void;
}

export default class PlayerInputter {
  keysDown = new Set<number>();
  private newKeysPressed = new Set<number>();
  private allKeysPressed = new Set<number>();

  onKeyDown: (keyCode: number) => void;
  onKeyUp: (keyCode: number) => void;

  constructor(opts: Options = {}) {
    this.onKeyDown = opts.onKeyDown || (() => {});
    this.onKeyUp = opts.onKeyUp || (() => {});
  }

  getKeysPressedAndClear(): Set<number> {
    const pressed = new Set(this.newKeysPressed);
    this.newKeysPressed.clear();
    return pressed;
  }

  registerLocalListeners() {
    window.addEventListener('keydown', (e) => {
      this.handleKeyDown(e.keyCode);

      if (interruptKeyCodes.has(e.keyCode)) {
        e.preventDefault();
        return false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.keyCode);
    });
  }

  handleKeyDown(keyCode: number) {
    this.keysDown.add(keyCode);
    if (!this.allKeysPressed.has(keyCode)) {
      this.allKeysPressed.add(keyCode);
      this.newKeysPressed.add(keyCode);
      this.onKeyDown(keyCode);
    }
  }

  handleKeyUp(keyCode: number) {
    this.keysDown.delete(keyCode);
    this.allKeysPressed.delete(keyCode);
    this.newKeysPressed.delete(keyCode);
    this.onKeyUp(keyCode);
  }
}
