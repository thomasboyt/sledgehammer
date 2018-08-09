import { Coordinates, PolygonRenderer, BoxCollider } from 'pearl';
import { NetworkedPrefab, NetworkedPhysical } from 'pearl-networking';
import Bullet from '../components/Bullet';
import { ZIndex } from '../types';

const bullet: NetworkedPrefab = {
  type: 'bullet',

  zIndex: ZIndex.Bullet,

  createComponents: () => {
    return [
      new Bullet(),
      new NetworkedPhysical({
        center: { x: 0, y: 0 },
      }),
      new PolygonRenderer({ fillStyle: 'pink' }),
      new BoxCollider({ width: 6, height: 6 }),
    ];
  },
};

export default bullet;
