import {
  Component,
  Physical,
  Entity,
  Vector2,
  BoxCollider,
  VectorMaths as V,
  CollisionInformation,
  KinematicBody,
} from 'pearl';
import { NetworkingHost } from 'pearl-networking';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';
import Game from './Game';

const worldWidth = TILE_SIZE * WORLD_SIZE_WIDTH;
const worldHeight = TILE_SIZE * WORLD_SIZE_HEIGHT;

interface ShootOptions {
  originObject: Entity;
  facing: Vector2;
  speed: number;
}

export default class Bullet extends Component<null> {
  origin?: Entity;
  vel: Vector2 = { x: 0, y: 0 };

  shoot(opts: ShootOptions) {
    this.origin = opts.originObject;
    const { facing, speed } = opts;

    const phys = this.getComponent(Physical);
    const collider = this.getComponent(BoxCollider);
    const originPhys = this.origin.getComponent(Physical);
    const originCollider = this.origin.getComponent(BoxCollider);

    // (3px padding is kinda arbitrary and may need to be shifted if velocities
    // of players or bullets are changed since it's possible for a player to
    // "catch up" if they shoot in direction they are moving)
    phys.center = {
      x:
        originPhys.center.x +
        facing.x * (originCollider.width! / 2 + collider.width! / 2 + 3),
      y:
        originPhys.center.y +
        facing.y * (originCollider.height! / 2 + collider.height! / 2 + 3),
    };

    this.vel = {
      x: facing.x * speed,
      y: facing.y * speed,
    };
  }

  update(dt: number) {
    // clean up off screen bullets
    if (!this.pearl.root.getComponent(Game).isHost) {
      return;
    }

    this.getComponent(KinematicBody).moveAndCollide(V.multiply(this.vel, dt));

    const collider = this.getComponent(BoxCollider);
    const bounds = collider.getLocalBounds();

    if (
      bounds.xMin < 0 ||
      bounds.xMax > worldWidth ||
      bounds.yMin < 0 ||
      bounds.yMax > worldHeight
    ) {
      this.pearl.entities.destroy(this.entity);
    }
  }

  explode() {
    // prevent explode() from being called twice when bullet has multiple
    // collisions
    if (this.entity.state === 'destroyed') {
      return;
    }

    this.pearl.entities.destroy(this.entity);

    const explosionObj = this.pearl.root
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bulletExplosion');

    const phys = this.getComponent(Physical);
    explosionObj.getComponent(Physical).center = {
      x: phys.center.x,
      y: phys.center.y,
    };
  }

  onCollision(collision: CollisionInformation) {
    this.explode();
  }
}
