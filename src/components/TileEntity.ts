import {
  Physical,
  Component,
  Vector2,
  Entity,
  KinematicBody,
  VectorMaths as V,
} from 'pearl';
import TileMap from './TileMap';

class MoveTween {
  elapsedMs: number = 0;
  targetMs: number;
  phys: Physical;
  body: KinematicBody;
  start: Vector2;
  end: Vector2;

  constructor(
    phys: Physical,
    body: KinematicBody,
    start: Vector2,
    end: Vector2,
    targetMs: number
  ) {
    this.targetMs = targetMs;
    this.phys = phys;
    this.body = body;
    this.start = start;
    this.end = end;
  }

  update(dt: number): boolean {
    this.elapsedMs += dt;

    if (this.elapsedMs > this.targetMs) {
      this.targetMs = this.elapsedMs;
    }

    const f = this.elapsedMs / this.targetMs;
    const nextCenter = V.lerp(this.start, this.end, f);
    const moveVector = V.subtract(nextCenter, this.phys.localCenter);

    const collisions = this.body.moveAndSlide(moveVector);
    // TODO: Some day would be nice to have settings around what to do on
    // collision (revert to previous position? continue going and assume other
    // object will be destroyed?)
    //
    // const solidCollisions = collisions.filter((collision) =>
    //   !collision.collider.isTrigger
    // );

    // if (solidCollisions.length) {
    //   console.log('colliding', this.phys.entity, solidCollisions[0]);
    //   return true;
    // }

    if (f === 1) {
      return true;
    }

    return false;
  }
}

export default class TileEntity extends Component<null> {
  moveTween?: MoveTween;

  world?: Entity;

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

  get tilePosition(): Vector2 {
    const center = this.getComponent(Physical).localCenter;
    return this.tileMap.localCenterToTileCoordinates(center);
  }

  setPosition(pos: Vector2): void {
    const center = this.tileMap.tileCoordinatesToLocalCenter(pos);
    this.getComponent(Physical).localCenter = center;
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
   * Move spaces in the grid over some number of milliseconds
   */
  move(endTilePos: Vector2, timeMs: number): void {
    if (this.isMoving) {
      throw new Error('already moving; cannot move again');
    }

    const startTilePos = { x: this.tilePosition.x, y: this.tilePosition.y };
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

    const start = this.tileMap.tileCoordinatesToLocalCenter(startTilePos);
    const end = this.tileMap.tileCoordinatesToLocalCenter(wrappedEndPos);

    const phys = this.getComponent(Physical);
    this.moveTween = new MoveTween(
      phys,
      this.getComponent(KinematicBody),
      start,
      end,
      timeMs
    );
  }

  /**
   * Cancel current move
   */
  cancelMove() {
    this.moveTween = undefined;
  }
}
