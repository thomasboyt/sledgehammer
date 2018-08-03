import { NetworkedPrefab, NetworkedPhysical } from 'pearl-networking';
import BulletExplosion from '../components/BulletExplosion';
import { ZIndex } from '../types';

const bulletExplosion: NetworkedPrefab = {
  type: 'bulletExplosion',

  zIndex: ZIndex.BulletExplosion,

  createComponents: () => {
    return [
      new BulletExplosion(),
      new NetworkedPhysical({
        center: { x: 0, y: 0 },
      }),
    ];
  },
};

export default bulletExplosion;
