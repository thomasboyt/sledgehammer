import {
  Component,
  Physical,
  PolygonCollider,
  Coordinates,
  GameObject,
} from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import BulletExplosion from './BulletExplosion';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';
import Game from './Game';

const worldWidth = TILE_SIZE * WORLD_SIZE_WIDTH;
const worldHeight = TILE_SIZE * WORLD_SIZE_HEIGHT;

interface ShootOptions {
  originObject: GameObject;
  facing: Coordinates;
  speed: number;
}

export default class Bullet extends Component<null> {
  origin?: GameObject;

  shoot(opts: ShootOptions) {
    this.origin = opts.originObject;
    const { facing, speed } = opts;

    const phys = this.getComponent(Physical);
    const collider = this.getComponent(PolygonCollider);
    const originPhys = this.origin.getComponent(Physical);
    const originCollider = this.origin.getComponent(PolygonCollider);

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

    phys.vel = {
      x: facing.x * speed,
      y: facing.y * speed,
    };
  }

  update(dt: number) {
    // clean up off screen bullets
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    const collider = this.getComponent(PolygonCollider);
    const bounds = collider.getBounds();

    if (
      bounds.xMin < 0 ||
      bounds.xMax > worldWidth ||
      bounds.yMin < 0 ||
      bounds.yMax > worldHeight
    ) {
      this.pearl.entities.destroy(this.gameObject);
    }
  }

  explode() {
    this.pearl.entities.destroy(this.gameObject);

    const explosionObj = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bulletExplosion');

    const phys = this.getComponent(Physical);
    explosionObj.getComponent(Physical).center = {
      x: phys.center.x,
      y: phys.center.y,
    };
  }
}
