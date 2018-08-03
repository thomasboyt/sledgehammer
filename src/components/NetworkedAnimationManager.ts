import { AnimationManager, SpriteRenderer } from 'pearl';

interface Serializable<T> {
  serialize(): T;
  deserialize(snapshot: T): void;
}

interface Snapshot {
  current: string;
  scaleX: number;
  scaleY: number;
  isVisible: boolean;
}

export default class NetworkedAnimationManager extends AnimationManager
  implements Serializable<Snapshot> {
  serialize(): Snapshot {
    const { current } = this;
    const renderer = this.getComponent(SpriteRenderer);
    const { scaleX, scaleY, isVisible } = renderer;
    return { current, scaleX, scaleY, isVisible };
  }

  deserialize(snapshot: Snapshot) {
    const { current, scaleX, scaleY, isVisible } = snapshot;
    this.set(current);
    const renderer = this.getComponent(SpriteRenderer);
    renderer.scaleX = scaleX;
    renderer.scaleY = scaleY;
    renderer.isVisible = isVisible;
  }
}
