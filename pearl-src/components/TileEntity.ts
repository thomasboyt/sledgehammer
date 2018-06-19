import { Physical, Component, Coordinates, GameObject } from 'pearl';
import TileMap from './TileMap';
import { lerpVector } from '../util/math';

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
    this.phys.center = lerpVector(this.start, this.end, f);

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
  move(endTilePos: Coordinates, timeMs: number): void {
    if (this.isMoving) {
      throw new Error('already moving; cannot move again');
    }

    const startTilePos = this.tilePosition;
    const wrappedEndPos = this.tileMap.wrapTilePosition(endTilePos);

    if (wrappedEndPos.x !== endTilePos.x) {
      if (wrappedEndPos.x === 0) {
        startTilePos.x = -1;
      } else {
        startTilePos.x = this.tileMap.worldSize!.x;
      }
    } else if (wrappedEndPos.y !== endTilePos.y) {
      if (wrappedEndPos.y === 0) {
        startTilePos.y = -1;
      } else {
        startTilePos.y = this.tileMap.worldSize!.y;
      }
    }

    const start = this.tileMap.tileCoordinatesToCenter(startTilePos);
    const end = this.tileMap.tileCoordinatesToCenter(wrappedEndPos);

    const phys = this.getComponent(Physical);
    this.moveTween = new MoveTween(phys, start, end, timeMs);
  }
}