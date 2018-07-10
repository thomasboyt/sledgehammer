import { Component, Physical, Coordinates } from 'pearl';
import Session from './Session';
import { lerp } from '../util/math';
import { WIDTH } from '../constants';

/**
 * lmao
 */
export default class LevelTransitionManager extends Component<null> {
  transitionLengthMs = 2000;
  active = false;
  offscreenPosition = WIDTH;

  private elapsedMs = 0;
  private prevCanvas?: HTMLCanvasElement;
  private destPos?: Coordinates;
  private onFinishCb?: () => void;

  /**
   * Save the canvas render output of the previous world for use in the
   * transition.
   */
  rpcSetPrevWorld() {
    const prevWorld = this.getComponent(Session).worldObj;

    const canvas = document.createElement('canvas');
    canvas.width = this.pearl.renderer.getViewSize().x;
    canvas.height = this.pearl.renderer.getViewSize().y;
    const ctx = canvas.getContext('2d')!;
    prevWorld.render(ctx);

    this.prevCanvas = canvas;
  }

  /**
   * Start the transition. This is triggered by the host's Session
   */
  start(onFinishCb: () => void) {
    this.rpcStart();

    // This only needs to  be set on the host because otherwise there's a frame
    // rendered with the *initial* position
    const worldPhys = this.getComponent(Session).worldObj.getComponent(
      Physical
    );
    worldPhys.center = {
      x: this.destPos!.x + this.offscreenPosition,
      y: this.destPos!.y,
    };

    this.onFinishCb = onFinishCb;
  }

  rpcStart() {
    this.elapsedMs = 0;
    this.active = true;
    const worldPhys = this.getComponent(Session).worldObj.getComponent(
      Physical
    );
    this.destPos = worldPhys.center;
  }

  update(dt: number) {
    if (!this.active) {
      return;
    }

    this.elapsedMs += dt;
    if (this.elapsedMs > this.transitionLengthMs) {
      this.elapsedMs = this.transitionLengthMs;
      this.active = false;
    }

    const nextOffset = lerp(
      this.offscreenPosition,
      0,
      this.elapsedMs / this.transitionLengthMs
    );
    const worldPhys = this.getComponent(Session).worldObj!.getComponent(
      Physical
    );
    worldPhys.center = {
      x: this.destPos!.x + nextOffset,
      y: this.destPos!.y,
    };

    if (!this.active && this.onFinishCb) {
      this.onFinishCb();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.active || !this.prevCanvas) {
      return;
    }

    ctx.save();
    const prevOffset = lerp(
      0,
      -this.offscreenPosition,
      this.elapsedMs / this.transitionLengthMs
    );
    ctx.translate(prevOffset, 0);
    ctx.drawImage(this.prevCanvas, 0, 0);
    ctx.restore();
  }
}
