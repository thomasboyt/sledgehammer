type Coordinates = [number, number];

export interface BoundingBox {
  center: Coordinates;
  width: number;
  height: number;
  // TODO: ACTUALLY SUPPORT COLLISIONS USING THIS LMAO
  angle: number;
  vec?: [number, number];
}

interface SidePositions {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Intersection {
  width: number;
  height: number;
}

function sidesForBoundingBox(boundingBox: BoundingBox): SidePositions {
  return {
    left: boundingBox.center[0] - boundingBox.width / 2,
    right: boundingBox.center[0] + boundingBox.width / 2,
    top: boundingBox.center[1] - boundingBox.height / 2,
    bottom: boundingBox.center[1] + boundingBox.height / 2,
  };
}

export function isColliding(self: BoundingBox, other: BoundingBox): boolean {
  const rect1 = sidesForBoundingBox(self);
  const rect2 = sidesForBoundingBox(other);
  return (
    rect1.left < rect2.right &&
    rect1.right > rect2.left &&
    rect1.top < rect2.bottom &&
    rect1.bottom > rect2.top
  );
}

export function rectangleIntersection(
  self: BoundingBox,
  other: BoundingBox
): Intersection {
  // returns the size of the intersection between two rectangles as {w, h}
  const selfSides = sidesForBoundingBox(self);
  const otherSides = sidesForBoundingBox(other);

  // TODO: I basically don't understand how this math works lmao
  return {
    width:
      selfSides.left > otherSides.left
        ? -(otherSides.right - selfSides.left)
        : selfSides.right - otherSides.left,
    height:
      selfSides.top > otherSides.top
        ? -(otherSides.bottom - selfSides.top)
        : selfSides.bottom - otherSides.top,
  };
}

export function getXDepth(self: BoundingBox, other: BoundingBox): number {
  return rectangleIntersection(self, other).width;
}

export function getYDepth(self: BoundingBox, other: BoundingBox): number {
  return rectangleIntersection(self, other).height;
}

export function getCollisionPairs<T>(objects: T[]) {
  const collisionPairs: [T, T][] = [];

  for (let i = 0; i < objects.length; i += 1) {
    for (let j = i + 1; j < objects.length; j += 1) {
      collisionPairs.push([objects[i], objects[j]]);
    }
  }

  return collisionPairs;
}
