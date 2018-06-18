import { Component, Physical } from 'pearl';
import Game from './Game';
import NetworkingHost from './networking/NetworkingHost';
import BulletExplosion from './BulletExplosion';

export default class Bullet extends Component<null> {
  explode() {
    this.pearl.entities.destroy(this.gameObject);

    const explosionObj = this.pearl.obj
      .getComponent(Game)
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
