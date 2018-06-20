import { Physical, Coordinates } from 'pearl';

export interface PhysicalSnapshot {
  center: Coordinates;
  angle: number;
  vel: Coordinates;
}

export function serializePhysical(phys: Physical): PhysicalSnapshot {
  const { center, angle, vel } = phys;
  return { center, angle, vel };
}

export function deserializePhysical(
  phys: Physical,
  snapshot: PhysicalSnapshot
) {
  const { center, angle, vel } = snapshot;
  phys.center = snapshot.center;
  phys.angle = snapshot.angle;
  phys.vel = snapshot.vel;
}
