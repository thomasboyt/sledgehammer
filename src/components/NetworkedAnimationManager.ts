import { AnimationManager } from 'pearl';
import { NetworkedComponent } from 'pearl-networking';

interface Snapshot {
  current: string;
}

export default class NetworkedAnimationManager extends AnimationManager
  implements NetworkedComponent<Snapshot> {
  serialize(): Snapshot {
    const { current } = this;
    return { current };
  }

  deserialize(snapshot: Snapshot) {
    const { current } = snapshot;
    this.set(current);
  }
}
