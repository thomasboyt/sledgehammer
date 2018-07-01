import { PolygonCollider, Physical, PolygonRenderer } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import {
  PhysicalSnapshot,
  serializePhysical,
  deserializePhysical,
} from '../serializers/serializePhysical';
import Pickup from '../components/Pickup';
import { ZIndex } from '../types';

interface PickupSnapshot {
  physical: PhysicalSnapshot;
}

const pickup: NetworkedPrefab<PickupSnapshot> = {
  type: 'pickup',

  zIndex: ZIndex.Pickup,

  createComponents: () => {
    return [
      new Physical(),
      PolygonCollider.createBox({ width: 10, height: 10 }),
      new PolygonRenderer({
        fillStyle: 'white',
      }),
      new Pickup(),
    ];
  },

  serialize: (obj) => {
    const phys = obj.getComponent(Physical);

    return {
      physical: serializePhysical(phys),
    };
  },

  deserialize: (obj, snapshot) => {
    const phys = obj.getComponent(Physical);
    deserializePhysical(phys, snapshot.physical);
  },
};

export default pickup;
