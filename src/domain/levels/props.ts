import type { ArenaBox } from './arena';
import { aabb } from '../Aabb';
import { layoutToDecor } from './layoutToDecor';
import type { FurnitureLayout } from './furnitureCatalog';
import workshopJson from './layouts/workshop.json';

/**
 * Декорации с коллизией. Коробки считаются из схемы `layouts/workshop.json`.
 * Ковёр в схеме с `collide: false` — в этот список не попадает.
 */
export const DECOR: ArenaBox[] = layoutToDecor(workshopJson as FurnitureLayout);

/** Коробка декорации по мировым координатам двух углов. */
export function decorBox(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
  options: { invisible?: boolean } = {},
): ArenaBox {
  return {
    kind: 'decor',
    invisible: options.invisible === true,
    ...aabb(minX, minY, minZ, maxX, maxY, maxZ),
  };
}
