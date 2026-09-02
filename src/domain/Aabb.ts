export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export function aabb(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): Aabb {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Касание гранями пересечением не считается, иначе стоять на полу нельзя. */
export function aabbOverlaps(a: Aabb, b: Aabb): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

/** Расстояние до входа в коробку вдоль луча. Внутри — 0. Мимо или дальше maxDist — null. */
export function aabbRayDistance(
  box: Aabb,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): number | null {
  let tmin = 0;
  let tmax = maxDist;
  const x = clipSlab(ox, dx, box.minX, box.maxX, tmin, tmax);
  if (x === null) return null;
  tmin = x[0];
  tmax = x[1];
  const y = clipSlab(oy, dy, box.minY, box.maxY, tmin, tmax);
  if (y === null) return null;
  tmin = y[0];
  tmax = y[1];
  const z = clipSlab(oz, dz, box.minZ, box.maxZ, tmin, tmax);
  if (z === null) return null;
  return z[0];
}

function clipSlab(
  origin: number,
  dir: number,
  min: number,
  max: number,
  tmin: number,
  tmax: number,
): [number, number] | null {
  if (Math.abs(dir) < 1e-8) {
    if (origin < min || origin > max) return null;
    return [tmin, tmax];
  }
  let t1 = (min - origin) / dir;
  let t2 = (max - origin) / dir;
  if (t1 > t2) {
    const swap = t1;
    t1 = t2;
    t2 = swap;
  }
  const nextMin = t1 > tmin ? t1 : tmin;
  const nextMax = t2 < tmax ? t2 : tmax;
  if (nextMin > nextMax) return null;
  return [nextMin, nextMax];
}

export function aabbContains(box: Aabb, x: number, y: number, z: number): boolean {
  return (
    x >= box.minX &&
    x <= box.maxX &&
    y >= box.minY &&
    y <= box.maxY &&
    z >= box.minZ &&
    z <= box.maxZ
  );
}
