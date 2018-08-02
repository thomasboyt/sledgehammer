import { Physical, Coordinates, PolygonRenderer, BoxCollider } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import Bullet from '../components/Bullet';
import { ZIndex } from '../types';

interface BulletSnapshot {
  center: Coordinates;
}

const bullet: NetworkedPrefab<BulletSnapshot> = {
  type: 'bullet',

  zIndex: ZIndex.Bullet,

  createComponents: () => {
    return [
      new Bullet(),
      new Physical({
        center: { x: 0, y: 0 },
      }),
      new PolygonRenderer({ fillStyle: 'pink' }),
      new BoxCollider({ width: 6, height: 6 }),
    ];
  },

  serialize(obj) {
    const phys = obj.getComponent(Physical);
    return { center: phys.center };
  },

  deserialize(obj, snapshot) {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
  },
};

export default bullet;
