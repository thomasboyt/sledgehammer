import { Component, PolygonCollider, GameObject } from 'pearl';
import TileMap from './TileMap';
import Game from './Game';
import World from './World';
import { Tile } from '../types';

export default class Bullet extends Component<null> {
  worldObject?: GameObject;

  update(dt: number) {
    if (!this.pearl.obj.getComponent(Game).isHost) {
      return;
    }

    if (!this.worldObject) {
      throw new Error('missing world object in bullet');
    }

    // TODO: this sucks lmfao
    const tileMap = this.worldObject.getComponent(TileMap) as TileMap<Tile>;
    const collider = this.getComponent(PolygonCollider);

    if (tileMap.isColliding(collider, [Tile.Wall])) {
      this.pearl.entities.destroy(this.gameObject);
    }
  }
}
