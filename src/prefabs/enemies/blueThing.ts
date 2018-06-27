import enemyFactory from './enemyFactory';
import BaseEnemy from '../../components/enemies/BaseEnemy';

export default enemyFactory({
  type: 'blueThing',
  EnemyComponent: BaseEnemy,
  spriteSheet: 'blueThing',
});
