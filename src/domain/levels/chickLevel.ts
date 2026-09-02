import chickVox from '../../../assets/vox/chick.vox';
import type { LevelData } from './LevelData';
import { createShapeLevel } from './shapeLevel';

/**
 * Птенец из `assets/vox/chick.vox`. MagicaVoxel: Z вверх, размер там 6×8×9.
 * В игре это ширина × высота × глубина = 6×9×8.
 * В файле модель смотрит не туда, куда игрок со спавна: клетки крутятся на 180°
 * вокруг Y (x,z → NX−1−x, NZ−1−z), лапы остаются на y = 0.
 * Сетка `little` 11×9×10: глыба на столике, высота фигуры совпадает с сеткой.
 * Пока долбишь — вся фигура зелёная; после зачистки мрамора включаются цвета из `.vox`.
 */
export const CHICK_NATIVE: [number, number, number] = chickVox.size;

const [NX, , NZ] = CHICK_NATIVE;

const sculpture = new Map<string, number>();
for (const v of chickVox.voxels) {
  sculpture.set(`${NX - 1 - v.x},${v.y},${NZ - 1 - v.z}`, (v.r << 16) | (v.g << 8) | v.b);
}

export function createChickLevel(size: [number, number, number]): LevelData {
  const [sx, , sz] = size;
  const ox = Math.floor((sx - NX) / 2);
  const oy = 0;
  const oz = Math.floor((sz - NZ) / 2);

  return createShapeLevel(
    'chick',
    size,
    (x, y, z) => sculpture.has(`${x - ox},${y - oy},${z - oz}`),
    (x, y, z) => sculpture.get(`${x - ox},${y - oy},${z - oz}`) ?? 0,
  );
}
