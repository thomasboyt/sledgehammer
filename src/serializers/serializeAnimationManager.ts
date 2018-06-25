import { AnimationManager } from 'pearl';

export interface AnimationSnapshot {
  current: string;
  scaleX: number;
  scaleY: number;
  isVisible: boolean;
}

export function serializeAnimationManager(
  anim: AnimationManager
): AnimationSnapshot {
  const { current, scaleX, scaleY, isVisible } = anim;
  return { current, scaleX, scaleY, isVisible };
}

export function deserializeAnimationManager(
  anim: AnimationManager,
  snapshot: AnimationSnapshot
) {
  const { current, scaleX, scaleY, isVisible } = snapshot;
  anim.set(current);
  anim.setScale(scaleX, scaleY);
  anim.isVisible = isVisible;
}
