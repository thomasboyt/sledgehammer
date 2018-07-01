import BaseEnemy from './BaseEnemy';
import TileEntity from '../TileEntity';
import NetworkingHost from '../networking/NetworkingHost';
import Bullet from '../Bullet';
import Player from '../Player';

const ENEMY_BULLET_SPEED = 0.1;

export default class ShootEnemy extends BaseEnemy {
  timeSinceLastShot = 0;

  updateAlive(dt: number) {
    const tileEntity = this.getComponent(TileEntity);

    if (!tileEntity.isMoving) {
      this.nextMove();
    }

    this.timeSinceLastShot += dt;

    if (this.timeSinceLastShot < 1500) {
      return;
    }

    const entities = this.getEntitiesInSightline(10, ['player', 'enemy']);

    const aliveEntities = entities.filter((obj) => {
      if (obj.hasTag('enemy')) {
        const enemy = obj.getComponent(BaseEnemy);
        return enemy.state === 'alive';
      } else if (obj.hasTag('player')) {
        const player = obj.getComponent(Player);
        return player.playerState === 'alive';
      }
    });

    if (aliveEntities.length) {
      this.shoot();
    }
  }

  shoot() {
    const bullet = this.pearl.obj
      .getComponent(NetworkingHost)
      .createNetworkedPrefab('bullet');

    bullet.getComponent(Bullet).shoot({
      originObject: this.gameObject,
      facing: this.facing,
      speed: ENEMY_BULLET_SPEED,
    });

    this.timeSinceLastShot = 0;
  }
}
