import { Component, Physical, PolygonCollider } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import BulletExplosion from './BulletExplosion';
import { TILE_SIZE, WORLD_SIZE_WIDTH, WORLD_SIZE_HEIGHT } from '../constants';
import Game from './Game';

const worldWidth = TILE_SIZE * WORLD_SIZE_WIDTH;
const worldHeight = TILE_SIZE * WORLD_SIZE_HEIGHT;

export default class Bullet extends Component<null> {
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
