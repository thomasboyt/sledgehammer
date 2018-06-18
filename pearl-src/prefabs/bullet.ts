import { PolygonCollider, Physical, Coordinates, PolygonRenderer } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import Bullet from '../components/Bullet';

interface BulletSnapshot {
  center: Coordinates;
  vel: Coordinates;
}

const bullet: NetworkedPrefab<BulletSnapshot> = {
  type: 'bullet',

  createComponents: () => {
    return [
      new Bullet(),
      new Physical({
        center: { x: 0, y: 0 },
      }),
      new PolygonRenderer({ fillStyle: 'pink' }),
      PolygonCollider.createBox({ width: 6, height: 6 }),
    ];
  },

  serialize(obj) {
    const phys = obj.getComponent(Physical);
    return { center: phys.center, vel: phys.vel };
  },

  deserialize(obj, snapshot) {
    const phys = obj.getComponent(Physical);
    phys.center = snapshot.center;
    phys.vel = snapshot.vel;
  },
};

export default bullet;
