import { aabb } from '../Aabb';
import type { ArenaBox } from './arena';

/**
 * Декорации с коллизией — единственное место, куда их нужно добавлять.
 * Коробка отсюда попадает и в физику, и в блок-аут, поэтому картинка и препятствие
 * не могут разъехаться. Когда серую коробку заменит модель, поставь `invisible: true`:
 * коллизия останется, а рисовать её перестанут.
 *
 * Координаты — мировые единицы, `y = 0` это пол арены. Границы арены — `CONFIG.arena.halfExtent`.
 */
export const DECOR: ArenaBox[] = [];

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
