import duckVox from '../../../assets/vox/duck.vox';
import type { LevelData } from './LevelData';
import { createShapeLevel } from './shapeLevel';

/**
 * Утка из `assets/vox/duck.vox`. MagicaVoxel: Z вверх, размер там 6×8×9.
 * В игре это ширина × высота × глубина = 6×9×8, клюв как в файле.
 * Лапы на y = 0 — глыба на полу, утка стоит на полу.
 * Пока долбишь — вся фигура зелёная; после зачистки мрамора включаются цвета из `.vox`.
 */
export const DUCK_NATIVE: [number, number, number] = duckVox.size;

const [NX, , NZ] = DUCK_NATIVE;

const sculpture = new Map<string, number>();
for (const v of duckVox.voxels) {
  sculpture.set(`${v.x},${v.y},${v.z}`, (v.r << 16) | (v.g << 8) | v.b);
}

export function createDuckLevel(size: [number, number, number]): LevelData {
  const [sx, , sz] = size;
  const ox = Math.floor((sx - NX) / 2);
  const oy = 0;
  const oz = Math.floor((sz - NZ) / 2);

  return createShapeLevel(
    'duck',
    size,
    (x, y, z) => sculpture.has(`${x - ox},${y - oy},${z - oz}`),
    (x, y, z) => sculpture.get(`${x - ox},${y - oy},${z - oz}`) ?? 0,
  );
}
