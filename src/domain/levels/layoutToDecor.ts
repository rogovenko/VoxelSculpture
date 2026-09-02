import { aabb, type Aabb } from '../Aabb';
import { CONFIG } from '../../config';
import type { ArenaBox, ArenaSpawn } from './arena';
import { DESK_DIARY, DESK_LETTER, DESK_PHONE, FURNITURE, type FurnitureLayout } from './furnitureCatalog';

/**
 * AABB коллизии из схемы: центр XZ, низ на полу, при ±90° меняются ширина и глубина.
 */
export function layoutToDecor(layout: FurnitureLayout, scale = CONFIG.arena.rugScale): ArenaBox[] {
  const boxes: ArenaBox[] = [];
  for (const item of layout.items) {
    if (!item.collide) continue;
    boxes.push({
      kind: 'decor',
      invisible: true,
      ...layoutItemAabb(item, scale),
    });
  }
  return boxes;
}

export function layoutItemAabb(
  item: FurnitureLayout['items'][number],
  scale = CONFIG.arena.rugScale,
): Aabb {
  const def = FURNITURE[item.kind];
  let sx = def.sizeCm[0] * scale;
  const sy = def.sizeCm[1] * scale;
  let sz = def.sizeCm[2] * scale;
  if (item.yawDeg === 90 || item.yawDeg === -90) {
    const swap = sx;
    sx = sz;
    sz = swap;
  }
  return aabb(item.x - sx / 2, 0, item.z - sz / 2, item.x + sx / 2, sy, item.z + sz / 2);
}

export function deskAabb(layout: FurnitureLayout): Aabb | null {
  const desk = layout.items.find((item) => item.kind === 'desk');
  return desk === undefined ? null : layoutItemAabb(desk);
}

/**
 * Рядом с кроватью, с внутренней стороны (к центру комнаты).
 * Взгляд после сна не из этой точки — камера остаётся как в момент «лечь».
 */
export function spawnBesideBed(
  layout: FurnitureLayout,
  playerWidth: number,
  gap: number,
): ArenaSpawn | null {
  const bed = layout.items.find((item) => item.kind === 'bed');
  if (bed === undefined) return null;
  const box = layoutItemAabb(bed);
  const cx = (box.minX + box.maxX) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  const len = Math.hypot(cx, cz);
  const nx = len > 0 ? -cx / len : 0;
  const nz = len > 0 ? -cz / len : 1;
  const hx = (box.maxX - box.minX) / 2;
  const hz = (box.maxZ - box.minZ) / 2;
  const tx = Math.abs(nx) > 1e-6 ? hx / Math.abs(nx) : Number.POSITIVE_INFINITY;
  const tz = Math.abs(nz) > 1e-6 ? hz / Math.abs(nz) : Number.POSITIVE_INFINITY;
  const edge = Math.min(tx, tz);
  const dist = edge + playerWidth / 2 + gap;
  const x = cx + nx * dist;
  const z = cz + nz * dist;
  return { x, y: 0, z, yawDeg: 0 };
}

/** Телефон на столе: локальный оффсет крутится с yaw стола. */
export function deskPhoneAabb(
  layout: FurnitureLayout,
  scale = CONFIG.arena.rugScale,
): Aabb | null {
  return deskPropAabb(layout, DESK_PHONE, scale);
}

/** Письмо на столешнице: та же схема, что у телефона. */
export function deskLetterAabb(
  layout: FurnitureLayout,
  scale = CONFIG.arena.rugScale,
): Aabb | null {
  return deskPropAabb(layout, DESK_LETTER, scale);
}

/** Дневник на столешнице. */
export function deskDiaryAabb(
  layout: FurnitureLayout,
  scale = CONFIG.arena.rugScale,
): Aabb | null {
  return deskPropAabb(layout, DESK_DIARY, scale);
}

function deskPropAabb(
  layout: FurnitureLayout,
  pose: {
    offsetCm: readonly [number, number, number];
    yawDeg: number;
    localMinCm: readonly [number, number, number];
    localMaxCm: readonly [number, number, number];
  },
  scale: number,
): Aabb | null {
  const desk = layout.items.find((item) => item.kind === 'desk');
  if (desk === undefined) return null;
  const [ox, oy, oz] = pose.offsetCm;
  const [minX, minY, minZ] = pose.localMinCm;
  const [maxX, maxY, maxZ] = pose.localMaxCm;
  let worldMinX = Infinity;
  let worldMinY = Infinity;
  let worldMinZ = Infinity;
  let worldMaxX = -Infinity;
  let worldMaxY = -Infinity;
  let worldMaxZ = -Infinity;
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const z of [minZ, maxZ]) {
        const [lx, lz] = rotateY(x, z, pose.yawDeg);
        const [wx, wz] = rotateY((lx + ox) * scale, (lz + oz) * scale, desk.yawDeg);
        const wy = (y + oy) * scale;
        const px = desk.x + wx;
        const pz = desk.z + wz;
        if (px < worldMinX) worldMinX = px;
        if (wy < worldMinY) worldMinY = wy;
        if (pz < worldMinZ) worldMinZ = pz;
        if (px > worldMaxX) worldMaxX = px;
        if (wy > worldMaxY) worldMaxY = wy;
        if (pz > worldMaxZ) worldMaxZ = pz;
      }
    }
  }
  return aabb(worldMinX, worldMinY, worldMinZ, worldMaxX, worldMaxY, worldMaxZ);
}

export type InteractKind =
  | 'desk'
  | 'phone'
  | 'letter'
  | 'diary'
  | 'bed'
  | 'armchair'
  | 'boxPile'
  | 'cabinet'
  | 'door'
  | 'television';

export interface InteractTarget {
  kind: InteractKind;
  box: Aabb;
}

const FURNITURE_INTERACT: ReadonlySet<string> = new Set([
  'desk',
  'bed',
  'armchair',
  'boxPile',
  'cabinet',
  'television',
]);

export function interactTargets(layout: FurnitureLayout): InteractTarget[] {
  const targets: InteractTarget[] = [];
  for (const item of layout.items) {
    if (!FURNITURE_INTERACT.has(item.kind)) continue;
    targets.push({ kind: item.kind as InteractKind, box: layoutItemAabb(item) });
  }
  const phone = deskPhoneAabb(layout);
  if (phone !== null) targets.push({ kind: 'phone', box: phone });
  const letter = deskLetterAabb(layout);
  if (letter !== null) targets.push({ kind: 'letter', box: letter });
  const diary = deskDiaryAabb(layout);
  if (diary !== null) targets.push({ kind: 'diary', box: diary });
  targets.push({ kind: 'door', box: doorAabb() });
  return targets;
}

/** Письмо, дневник и телефон лежат в объёме стола — ближний луч иначе всегда берёт стол. */
export function interactPriority(kind: InteractKind): number {
  return kind === 'phone' || kind === 'letter' || kind === 'diary' ? 1 : 0;
}

/** Панель двери: юг (−Z), колонка `wallDoorAlong`. */
export function doorAabb(): Aabb {
  const a = CONFIG.arena.halfExtent;
  const w = CONFIG.arena.wallThickness;
  const tiles = CONFIG.arena.wallTilesAlong;
  const col = CONFIG.arena.wallDoorAlong;
  const tileW = (2 * a) / tiles;
  const minX = -a + col * tileW;
  const height = CONFIG.arena.wallTop / CONFIG.arena.wallTilesUp;
  return aabb(minX, 0, -a - w, minX + tileW, height, -a);
}

function rotateY(x: number, z: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [x * c + z * s, -x * s + z * c];
}
