import { AnimationManager } from 'pearl';

export interface AnimationSnapshot {
  current: string;
  scaleX: number;
  scaleY: number;
  visible: boolean;
}

export function serializeAnimationManager(
  anim: AnimationManager
): AnimationSnapshot {
  const { current, scaleX, scaleY, visible } = anim;
  return { current, scaleX, scaleY, visible };
}

export function deserializeAnimationManager(
  anim: AnimationManager,
  snapshot: AnimationSnapshot
) {
  const { current, scaleX, scaleY, visible } = snapshot;
  anim.set(current);
  anim.setScale(scaleX, scaleY);
  anim.visible = visible;
}
