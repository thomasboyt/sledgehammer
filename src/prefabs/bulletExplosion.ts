import { Physical, Coordinates } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import BulletExplosion from '../components/BulletExplosion';

interface BulletExplosionSnapshot {
  center: Coordinates;
}

const bulletExplosion: NetworkedPrefab<BulletExplosionSnapshot> = {
  type: 'bulletExplosion',

  zIndex: 1,

  createComponents: () => {
    return [
      new BulletExplosion(),
      new Physical({
        center: { x: 0, y: 0 },
      }),
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

export default bulletExplosion;
