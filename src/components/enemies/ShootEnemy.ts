import BaseEnemy from './BaseEnemy';
import TileEntity from '../TileEntity';
import { NetworkingHost } from 'pearl-networking';
import Bullet from '../Bullet';
import Player from '../Player';
import { Physical } from 'pearl';

const ENEMY_BULLET_SPEED = 0.1;
const FIRE_THROTTLE_MS = 1500;

export default class ShootEnemy extends BaseEnemy {
  private didShoot: boolean = false;
  private seeEntity: boolean = false;

  updateAlive(dt: number) {
    const tileEntity = this.getComponent(TileEntity);

    if (!tileEntity.isMoving) {
      this.nextMove();
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
      this.seeEntity = true;
      this.shoot();
    } else {
      this.seeEntity = false;
    }
  }

  shoot() {
    if (this.didShoot) {
      return;
    }

    this.didShoot = true;

    this.runCoroutine(function*(this: ShootEnemy) {
      yield this.pearl.async.waitMs(300);

      if (this.state !== 'alive' || !this.seeEntity) {
        this.didShoot = false;
        return;
      }

      const bullet = this.pearl.root
        .getComponent(NetworkingHost)
        .createNetworkedPrefab('bullet');

      this.entity.parent!.appendChild(bullet);

      bullet.getComponent(Bullet).shoot({
        originObject: this.entity,
        facing: this.facing,
        speed: ENEMY_BULLET_SPEED,
      });

      yield this.pearl.async.waitMs(FIRE_THROTTLE_MS);

      this.didShoot = false;
    });
  }
}
