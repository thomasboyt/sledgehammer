import { PolygonRenderer, BoxCollider } from 'pearl';
import { NetworkedPrefab, NetworkedPhysical } from 'pearl-networking';
import Pickup from '../components/Pickup';
import { ZIndex } from '../types';

const pickup: NetworkedPrefab = {
  type: 'pickup',

  zIndex: ZIndex.Pickup,

  createComponents: () => {
    return [
      new NetworkedPhysical(),
      new BoxCollider({ width: 10, height: 10 }),
      new PolygonRenderer({
        fillStyle: 'white',
      }),
      new Pickup(),
    ];
  },
};

export default pickup;
