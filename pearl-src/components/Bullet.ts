import { Component, Physical } from 'pearl';
import NetworkingHost from './networking/NetworkingHost';
import BulletExplosion from './BulletExplosion';

export default class Bullet extends Component<null> {
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

    explosionObj.getComponent(BulletExplosion).start();
  }
}
