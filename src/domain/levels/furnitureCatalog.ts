/** Виды пропов комплекта. Габариты — единицы FBX (см), как у стен-модулей. */
export type FurnitureKind =
  | 'armchair'
  | 'television'
  | 'boxPile'
  | 'bookPile'
  | 'bed'
  | 'cabinet'
  | 'desk'
  | 'rug';

export interface FurnitureDef {
  kind: FurnitureKind;
  sizeCm: [number, number, number];
  collideByDefault: boolean;
}

export const FURNITURE: Record<FurnitureKind, FurnitureDef> = {
  armchair: { kind: 'armchair', sizeCm: [92.779, 145.15, 93.194], collideByDefault: true },
  television: { kind: 'television', sizeCm: [90.902, 65.575, 51.437], collideByDefault: true },
  boxPile: { kind: 'boxPile', sizeCm: [100.967, 91.668, 104.063], collideByDefault: true },
  bookPile: { kind: 'bookPile', sizeCm: [43.116, 30.614, 44.811], collideByDefault: true },
  bed: { kind: 'bed', sizeCm: [123.878, 113.312, 244.445], collideByDefault: true },
  cabinet: { kind: 'cabinet', sizeCm: [207.108, 210.287, 88.984], collideByDefault: true },
  /** Стол, табурет, телефон, письмо и дневник — один предмет. Коллизия как у стола. */
  desk: { kind: 'desk', sizeCm: [217.959, 83.62, 92.462], collideByDefault: true },
  rug: { kind: 'rug', sizeCm: [147.631, 9.084, 232.658], collideByDefault: false },
};

/**
 * Телефон на столешнице в локали стола (см). AABB файла — для подсветки,
 * коллизии нет: это часть `desk`.
 */
export const DESK_PHONE = {
  offsetCm: [82, 83.62, -8] as [number, number, number],
  yawDeg: -20,
  localMinCm: [-15.664, 0, -14.189] as [number, number, number],
  localMaxCm: [15.674, 16.722, 10.015] as [number, number, number],
};

/**
 * Письмо на столешнице: конверт + лист. Коллизии нет, AABB для прицела.
 * Слева от телефона, чуть криво, чтобы не выглядело линейкой.
 */
export const DESK_LETTER = {
  offsetCm: [-58, 83.62, 6] as [number, number, number],
  yawDeg: 22,
  envelopeCm: [32, 0.7, 22] as [number, number, number],
  paperCm: [24, 0.12, 34] as [number, number, number],
  paperOffsetCm: [5, 0.85, -8] as [number, number, number],
  paperYawDeg: -14,
  localMinCm: [-18, 0, -24] as [number, number, number],
  localMaxCm: [22, 8, 14] as [number, number, number],
};

/**
 * Дневник: раскрытая книга и ручка справа. Между письмом и телефоном.
 */
export const DESK_DIARY = {
  offsetCm: [12, 83.62, 3] as [number, number, number],
  yawDeg: -8,
  localMinCm: [-16, 0, -12] as [number, number, number],
  localMaxCm: [30, 6, 12] as [number, number, number],
};

export type YawDeg = 0 | 90 | -90 | 180;

export interface LayoutItem {
  id: string;
  kind: FurnitureKind;
  x: number;
  z: number;
  yawDeg: YawDeg;
  collide: boolean;
}

export interface FurnitureLayout {
  name: string;
  items: LayoutItem[];
}

export function isFurnitureKind(value: string): value is FurnitureKind {
  return value in FURNITURE;
}

export function normalizeYaw(deg: number): YawDeg {
  const n = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  if (n === 270) return -90;
  if (n === 90) return 90;
  if (n === 180) return 180;
  return 0;
}

export function rotateYaw90(deg: YawDeg): YawDeg {
  return normalizeYaw(deg + 90);
}

export function snapTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function parseFurnitureLayout(data: unknown): FurnitureLayout {
  if (data === null || typeof data !== 'object') {
    throw new Error('схема должна быть объектом');
  }
  const raw = data as { name?: unknown; items?: unknown };
  if (typeof raw.name !== 'string' || !Array.isArray(raw.items)) {
    throw new Error('нужны поля name и items');
  }
  const items: LayoutItem[] = [];
  for (const entry of raw.items) {
    if (entry === null || typeof entry !== 'object') continue;
    const it = entry as Record<string, unknown>;
    if (typeof it.kind !== 'string' || !isFurnitureKind(it.kind)) {
      throw new Error(`неизвестный kind: ${String(it.kind)}`);
    }
    items.push({
      id: String(it.id ?? it.kind),
      kind: it.kind,
      x: Number(it.x),
      z: Number(it.z),
      yawDeg: normalizeYaw(Number(it.yawDeg)),
      collide: Boolean(it.collide),
    });
  }
  return { name: raw.name, items };
}
