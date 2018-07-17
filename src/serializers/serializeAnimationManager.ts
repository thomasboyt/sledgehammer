import { AnimationManager, SpriteRenderer } from 'pearl';

export interface AnimationSnapshot {
  current: string;
  scaleX: number;
  scaleY: number;
  isVisible: boolean;
}

export function serializeAnimationManager(
  anim: AnimationManager,
  renderer: SpriteRenderer
): AnimationSnapshot {
  const { current } = anim;
  const { scaleX, scaleY, isVisible } = renderer;
  return { current, scaleX, scaleY, isVisible };
}

export function deserializeAnimationManager(
  anim: AnimationManager,
  renderer: SpriteRenderer,
  snapshot: AnimationSnapshot
) {
  const { current, scaleX, scaleY, isVisible } = snapshot;
  anim.set(current);
  renderer.scaleX = scaleX;
  renderer.scaleY = scaleY;
  renderer.isVisible = isVisible;
}
