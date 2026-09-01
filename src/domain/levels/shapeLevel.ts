import type { LevelData } from './LevelData';

/** Вернуть `true`, если клетка принадлежит скрытой фигуре, а не лишнему мрамору. */
export type ShapeTest = (x: number, y: number, z: number) => boolean;

/** Авторский цвет клетки скульптуры, 0xRRGGBB. Для мрамора не вызывается. */
export type PaintTest = (x: number, y: number, z: number) => number;

/**
 * Собирает уровень из предиката: клетка внутри фигуры — оригинал, всё прочее — мрамор.
 * В список попадают **все** клетки объёма: пропущенная клетка станет воздухом, то есть
 * дырой в глыбе ещё до первого удара.
 */
export function createShapeLevel(
  name: string,
  size: [number, number, number],
  isSculpture: ShapeTest,
  paintAt?: PaintTest,
): LevelData {
  const [sx, sy, sz] = size;
  const voxels = new Int32Array(sx * sy * sz * 4);
  const paint = paintAt === undefined ? undefined : new Uint32Array(sx * sy * sz);
  let w = 0;

  for (let z = 0; z < sz; z++) {
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        const sculpture = isSculpture(x, y, z);
        voxels[w++] = x;
        voxels[w++] = y;
        voxels[w++] = z;
        voxels[w++] = sculpture ? 2 : 1;
        if (paint !== undefined && paintAt !== undefined && sculpture) {
          paint[x + y * sx + z * sx * sy] = paintAt(x, y, z);
        }
      }
    }
  }

  return {
    version: 1,
    name,
    size,
    materials: { 1: 'marble', 2: 'sculpture' },
    voxels,
    paint,
  };
}
