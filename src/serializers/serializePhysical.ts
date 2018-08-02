import { Physical, Coordinates } from 'pearl';

export interface PhysicalSnapshot {
  center: Coordinates;
  angle: number;
}

export function serializePhysical(phys: Physical): PhysicalSnapshot {
  const { center, angle } = phys;
  return { center, angle };
}

export function deserializePhysical(
  phys: Physical,
  snapshot: PhysicalSnapshot
) {
  phys.center = snapshot.center;
  phys.angle = snapshot.angle;
}
