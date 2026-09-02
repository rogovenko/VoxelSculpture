import { CONFIG } from '../../config';
import { createBuddhaLevel } from './buddhaLevel';
import { createChickLevel } from './chickLevel';
import { createFrogLevel } from './frogLevel';
import type { LevelData } from './LevelData';

export type LevelFactory = (size: [number, number, number]) => LevelData;

/**
 * Сетка глыбы и обстановка заказа:
 * `little` — столик, `small` — на полу, `medium` — леса.
 */
export type LevelSize = 'little' | 'small' | 'medium';

export function gridSizeFor(size: LevelSize): [number, number, number] {
  const [x, y, z] = CONFIG.grid.sizes[size];
  return [x, y, z];
}

export interface LevelDef {
  id: string;
  number: number;
  title: string;
  size: LevelSize;
  /** Нет фабрики — заказ в каталоге есть, загрузить его нельзя. */
  create: LevelFactory | null;
}

/**
 * Порядок — очередь заказов (стол → кровать). Новый уровень — новая запись.
 */
export const LEVELS: readonly LevelDef[] = [
  { id: 'frog', number: 1, title: 'Лягушка', size: 'little', create: createFrogLevel },
  { id: 'chick', number: 2, title: 'Птенец', size: 'little', create: createChickLevel },
  { id: 'buddha', number: 3, title: 'Будда', size: 'medium', create: createBuddhaLevel },
];

export function playableLevel(id: string): LevelDef & { create: LevelFactory } {
  const found = LEVELS.find((level) => level.id === id);
  if (found === undefined || found.create === null) {
    throw new Error(`Level "${id}" is not playable`);
  }
  return found as LevelDef & { create: LevelFactory };
}

/** Следующий заказ в каталоге. Нет фабрики — пропуск. После последнего — `null`. */
export function nextPlayable(id: string): (LevelDef & { create: LevelFactory }) | null {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index < 0) return null;
  for (let i = index + 1; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    if (level.create !== null) return level as LevelDef & { create: LevelFactory };
  }
  return null;
}
