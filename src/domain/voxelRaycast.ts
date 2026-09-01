import { VoxelType, type Face, type HitResult, type SolidVoxelType } from './types';
import type { VoxelGrid } from './VoxelGrid';

const EPS = 1e-9;

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * origin и dir заданы в СЕТОЧНОМ пространстве: воксель (i,j,k) занимает [i,i+1]x[j,j+1]x[k,k+1].
 * dir обязан быть нормализован.
 * face — грань найденного вокселя, через которую в него вошёл луч.
 */
export function raycastVoxels(
  grid: VoxelGrid,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDistance: number,
): HitResult | null {
  const [sx, sy, sz] = grid.size;

  let tEnter = 0;
  let tExit = maxDistance;
  let entryFace: Face = 'py';

  const slab = (o: number, d: number, limit: number, faceLow: Face, faceHigh: Face): boolean => {
    if (Math.abs(d) < EPS) {
      return o >= 0 && o <= limit;
    }
    const inv = 1 / d;
    let t0 = (0 - o) * inv;
    let t1 = (limit - o) * inv;
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      entryFace = d > 0 ? faceLow : faceHigh;
    }
    if (t1 < tExit) tExit = t1;
    return tEnter <= tExit;
  };

  if (!slab(ox, dx, sx, 'nx', 'px')) return null;
  if (!slab(oy, dy, sy, 'ny', 'py')) return null;
  if (!slab(oz, dz, sz, 'nz', 'pz')) return null;
  if (tEnter > tExit) return null;

  let t = tEnter + 1e-5;
  if (t > maxDistance) return null;

  const px = ox + dx * t;
  const py = oy + dy * t;
  const pz = oz + dz * t;

  let x = clampInt(Math.floor(px), 0, sx - 1);
  let y = clampInt(Math.floor(py), 0, sy - 1);
  let z = clampInt(Math.floor(pz), 0, sz - 1);

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const tDeltaX = Math.abs(dx) < EPS ? Infinity : Math.abs(1 / dx);
  const tDeltaY = Math.abs(dy) < EPS ? Infinity : Math.abs(1 / dy);
  const tDeltaZ = Math.abs(dz) < EPS ? Infinity : Math.abs(1 / dz);

  let tMaxX =
    Math.abs(dx) < EPS ? Infinity : dx > 0 ? t + (x + 1 - px) / dx : t + (x - px) / dx;
  let tMaxY =
    Math.abs(dy) < EPS ? Infinity : dy > 0 ? t + (y + 1 - py) / dy : t + (y - py) / dy;
  let tMaxZ =
    Math.abs(dz) < EPS ? Infinity : dz > 0 ? t + (z + 1 - pz) / dz : t + (z - pz) / dz;

  let face: Face = entryFace;

  while (t <= maxDistance) {
    const index = grid.indexOf(x, y, z);
    const type = grid.type[index];
    if (type !== VoxelType.Air) {
      return { x, y, z, index, type: type as SolidVoxelType, face, distance: t };
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      face = stepX > 0 ? 'nx' : 'px';
      if (x < 0 || x >= sx) return null;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      face = stepY > 0 ? 'ny' : 'py';
      if (y < 0 || y >= sy) return null;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      face = stepZ > 0 ? 'nz' : 'pz';
      if (z < 0 || z >= sz) return null;
    }
  }

  return null;
}
