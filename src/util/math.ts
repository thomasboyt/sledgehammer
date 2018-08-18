import { Vector2 } from 'pearl';

export function getVectorComponents(magnitude: number, rad: number): Vector2 {
  const x = magnitude * Math.cos(rad);
  const y = magnitude * Math.sin(rad);
  return { x, y };
}

export const lerp = (a: number, b: number, f: number) => a + f * (b - a);
export const lerpVector = (a: Vector2, b: Vector2, f: number): Vector2 => ({
  x: lerp(a.x, b.x, f),
  y: lerp(a.y, b.y, f),
});

export const addVector = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

export function getRandomIntInclusive(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice<T>(arr: T[]) {
  return arr[getRandomInt(0, arr.length)];
}
