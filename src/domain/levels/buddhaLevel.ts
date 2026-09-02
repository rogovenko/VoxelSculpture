import buddhaVox from '../../../assets/vox/buddha.vox';
import type { LevelData } from './LevelData';
import { createShapeLevel } from './shapeLevel';

/**
 * Будда из `assets/vox/buddha.vox`. MagicaVoxel: Z вверх, размер там 24×14×32.
 * В игре это ширина × высота × глубина = 24×32×14.
 * Сидит на y = 0 — глыба `medium` на полу, вокруг клетка мрамора, сверху тоже.
 * Пока долбишь — вся фигура зелёная; после зачистки мрамора включаются цвета из `.vox`.
 */
export const BUDDHA_NATIVE: [number, number, number] = buddhaVox.size;

const [NX, , NZ] = BUDDHA_NATIVE;

const sculpture = new Map<string, number>();
for (const v of buddhaVox.voxels) {
  sculpture.set(`${v.x},${v.y},${v.z}`, (v.r << 16) | (v.g << 8) | v.b);
}

export function createBuddhaLevel(size: [number, number, number]): LevelData {
  const [sx, , sz] = size;
  const ox = Math.floor((sx - NX) / 2);
  const oy = 0;
  const oz = Math.floor((sz - NZ) / 2);

  return createShapeLevel(
    'buddha',
    size,
    (x, y, z) => sculpture.has(`${x - ox},${y - oy},${z - oz}`),
    (x, y, z) => sculpture.get(`${x - ox},${y - oy},${z - oz}`) ?? 0,
  );
}
