/*

THIS ISN'T USED YET!!!

I'd like it to be used so I can add placeholder entities for spawning entities and not have to add `if (entity.getComponent(SpawnRenderer).spawning) {...}` checks everywhere

Currently I have yet to figure out how to handle the problem of setting animation state on the placeholder from a prefab's initial animation state...

could be something like

```
const obj = createPrefab('lemon-shark');
const placeholder = createPrefab('spawnPlaceholder');
placeholder.getComponent(SpawnRenderer).initializeFrom(obj);
obj.setActive(false);  // TODO: IMPLEMENT THIS. Removes it from entities? Maybe?
placeholder.getComponent(SpawnRenderer).onSpawned.add(() => {
  obj.setActive(true);
  placeholder.destroy();
});
```

*/

import { Physical, Coordinates, AnimationManager } from 'pearl';
import { NetworkedPrefab } from '../components/networking/Networking';
import BulletExplosion from '../components/BulletExplosion';
import { ZIndex } from '../types';
import {
  PhysicalSnapshot,
  serializePhysical,
  deserializePhysical,
} from '../serializers/serializePhysical';
import {
  AnimationSnapshot,
  serializeAnimationManager,
  deserializeAnimationManager,
} from '../serializers/serializeAnimationManager';

interface SpawnPlaceholderSnapshot {
  physical: PhysicalSnapshot;
  animation: AnimationSnapshot;
}

const spawnPlaceholder: NetworkedPrefab<SpawnPlaceholderSnapshot> = {
  type: 'spawnPlaceholder',

  // zIndex: ZIndex.BulletExplosion,

  createComponents: () => {
    return [new Physical(), new AnimationManager()];
  },

  serialize: (obj) => {
    const phys = obj.getComponent(Physical);
    const anim = obj.getComponent(AnimationManager);

    return {
      physical: serializePhysical(phys),
      animation: serializeAnimationManager(anim),
    };
  },

  deserialize: (obj, snapshot, objectsById) => {
    const phys = obj.getComponent(Physical);
    deserializePhysical(phys, snapshot.physical);

    const anim = obj.getComponent(AnimationManager);
    deserializeAnimationManager(anim, snapshot.animation);
  },
};

export default spawnPlaceholder;
