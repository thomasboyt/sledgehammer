export function getVectorComponents(
  magnitude: number,
  rad: number
): [number, number] {
  const x = magnitude * Math.cos(rad);
  const y = magnitude * Math.sin(rad);
  return [x, y];
}
