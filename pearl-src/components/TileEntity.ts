import { Physical, Component, Coordinates, GameObject } from 'pearl';
import TileMap from './TileMap';

export const lerp = (a: number, b: number, f: number) => a + f * (b - a);
export const lerp2 = (
  a: Coordinates,
  b: Coordinates,
  f: number
): Coordinates => ({
  x: lerp(a.x, b.x, f),
  y: lerp(a.y, b.y, f),
});

class MoveTween {
  elapsedMs: number = 0;
  targetMs: number;
  phys: Physical;
  start: Coordinates;
  end: Coordinates;

  constructor(
    phys: Physical,
    start: Coordinates,
    end: Coordinates,
    targetMs: number
  ) {
    this.targetMs = targetMs;
    this.phys = phys;
    this.start = start;
    this.end = end;
  }

  update(dt: number): boolean {
    this.elapsedMs += dt;

    if (this.elapsedMs > this.targetMs) {
      this.targetMs = this.elapsedMs;
    }

    const f = this.elapsedMs / this.targetMs;
    this.phys.center = lerp2(this.start, this.end, f);

    if (f === 1) {
      return true;
    }

    return false;
  }
}

export default class TileEntity extends Component<null> {
  moveTween?: MoveTween;
  // tileMap!: TileMap<any>;

  world?: GameObject;

  get tileMap(): TileMap<any> {
    if (!this.world) {
      throw new Error('no world set on tileEntity');
    }

    const map = this.world.maybeGetComponent(TileMap);

    if (!map) {
      throw new Error('tileMap component missing on world object');
    }

    return map;
  }

  get tilePosition(): Coordinates {
    const center = this.getComponent(Physical).center;
    return this.tileMap.centerToTileCoordinates(center);
  }

  setPosition(pos: Coordinates): void {
    const center = this.tileMap.tileCoordinatesToCenter(pos);
    this.getComponent(Physical).center = center;
  }

  init() {
    // const tileMap =
    //   this.gameObject.parent &&
    //   this.gameObject.parent.maybeGetComponent(TileMap);
    // if (!tileMap) {
    //   throw new Error('TileEntity must be a child of a TileMap component');
    // }
    // this.tileMap = tileMap;
  }

  get isMoving(): boolean {
    return !!this.moveTween;
  }

  update(dt: number) {
    if (this.moveTween) {
      const isComplete = this.moveTween.update(dt);
      if (isComplete) {
        this.moveTween = undefined;
      }
    }
  }

  /**
   * Cancel current move
   */
  cancelMove() {
    this.moveTween = undefined;
  }

  /**
   * Move spaces in the grid over some number of milliseconds
   */
  move(destinationTileCoordinates: Coordinates, timeMs: number): void {
    if (this.isMoving) {
      throw new Error('already moving; cannot move again');
    }

    const phys = this.getComponent(Physical);
    const start = { x: phys.center.x, y: phys.center.y };
    const end = this.tileMap.tileCoordinatesToCenter(
      destinationTileCoordinates
    );

    this.moveTween = new MoveTween(phys, start, end, timeMs);
  }
}
