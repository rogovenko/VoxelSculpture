import type { LevelData } from './LevelData';
import { createShapeLevel } from './shapeLevel';

/**
 * Крест задан долями габарита, а не числом клеток: сетку можно дробить сколько угодно,
 * а фигура останется той же и той же толщины в мире. Доли взяты из исходных 7×12×7,
 * поэтому на той сетке раскладка совпадает с задокументированной клетка в клетку.
 */
const STEM_INSET = 2 / 7;
const BAR_INSET = 1 / 7;
const STEM_FOOT = 2 / 12;
const BAR_BOTTOM = 6 / 12;
const BAR_TOP = 8 / 12;

/** Отступ одинаков с двух сторон, поэтому симметрия фигуры не зависит от округления. */
function inset(fraction: number, extent: number): [number, number] {
  const from = Math.round(fraction * extent);
  return [from, extent - 1 - from];
}

export function createCrossLevel(size: [number, number, number]): LevelData {
  const [sx, sy, sz] = size;
  const [stemX0, stemX1] = inset(STEM_INSET, sx);
  const [stemZ0, stemZ1] = inset(STEM_INSET, sz);
  const [stemY0, stemY1] = inset(STEM_FOOT, sy);
  const [barX0, barX1] = inset(BAR_INSET, sx);
  const barY0 = Math.round(BAR_BOTTOM * sy);
  const barY1 = Math.round(BAR_TOP * sy) - 1;

  return createShapeLevel('cross', size, (x, y, z) => {
    const inDepth = z >= stemZ0 && z <= stemZ1;
    const inStem = inDepth && x >= stemX0 && x <= stemX1 && y >= stemY0 && y <= stemY1;
    const inBar = inDepth && x >= barX0 && x <= barX1 && y >= barY0 && y <= barY1;
    return inStem || inBar;
  });
}
