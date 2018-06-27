import enemyFactory from './enemyFactory';
import ChaseEnemy from '../../components/enemies/ChaseEnemy';

export default enemyFactory({
  type: 'lemonShark',
  EnemyComponent: ChaseEnemy,
  spriteSheet: 'lemonShark',
});
