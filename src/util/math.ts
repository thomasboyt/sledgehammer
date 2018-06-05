export type Vec2 = [number, number];

export function getVectorComponents(magnitude: number, rad: number): Vec2 {
  const x = magnitude * Math.cos(rad);
  const y = magnitude * Math.sin(rad);
  return [x, y];
}

export const lerp = (a: number, b: number, f: number) => a + f * (b - a);
export const lerp2 = (a: Vec2, b: Vec2, f: number): Vec2 => [
  lerp(a[0], b[0], f),
  lerp(a[1], b[1], f),
];

export const add2 = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
