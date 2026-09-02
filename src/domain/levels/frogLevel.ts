import frogVox from '../../../assets/vox/frog.vox';
import type { LevelData } from './LevelData';
import { createShapeLevel } from './shapeLevel';

/**
 * Лягушка из `assets/vox/frog.vox`. MagicaVoxel: Z вверх, размер там 9×8×8.
 * В игре это ширина × высота × глубина = 9×8×8.
 * Лапы на y = 0 сетки: глыба `little` стоит на столике, лягушка выше пола на три кубика.
 * Пока долбишь — вся фигура зелёная; после зачистки мрамора включаются цвета из `.vox`.
 */
export const FROG_NATIVE: [number, number, number] = frogVox.size;

const [NX, , NZ] = FROG_NATIVE;

const sculpture = new Map<string, number>();
for (const v of frogVox.voxels) {
  sculpture.set(`${v.x},${v.y},${v.z}`, (v.r << 16) | (v.g << 8) | v.b);
}

export function createFrogLevel(size: [number, number, number]): LevelData {
  const [sx, , sz] = size;
  const ox = Math.floor((sx - NX) / 2);
  const oy = 0;
  const oz = Math.floor((sz - NZ) / 2);

  return createShapeLevel(
    'frog',
    size,
    (x, y, z) => sculpture.has(`${x - ox},${y - oy},${z - oz}`),
    (x, y, z) => sculpture.get(`${x - ox},${y - oy},${z - oz}`) ?? 0,
  );
}
