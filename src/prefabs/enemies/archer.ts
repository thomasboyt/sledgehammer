import enemyFactory from './enemyFactory';
import ShootEnemy from '../../components/enemies/ShootEnemy';

export default enemyFactory({
  type: 'archer',
  EnemyComponent: ShootEnemy,
  spriteSheet: 'archer',
});
