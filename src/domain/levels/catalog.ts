import { CONFIG } from '../../config';
import { createCrossLevel } from './crossLevel';
import { createDuckLevel } from './duckLevel';
import type { LevelData } from './LevelData';

export type LevelFactory = (size: [number, number, number]) => LevelData;

/** Задаёт сетку глыбы и то, будут ли леса: на `small` их нет. */
export type LevelSize = 'small' | 'medium';

export function gridSizeFor(size: LevelSize): [number, number, number] {
  const [x, y, z] = CONFIG.grid.sizes[size];
  return [x, y, z];
}

export interface LevelDef {
  id: string;
  number: number;
  title: string;
  size: LevelSize;
  /** Нет фабрики — квадратик в меню рисуется, но выбрать его нельзя. */
  create: LevelFactory | null;
}

/**
 * Порядок — порядок квадратиков в стартовом меню. Новый уровень — новая запись.
 */
export const LEVELS: readonly LevelDef[] = [
  { id: 'duck', number: 1, title: 'Утка', size: 'small', create: createDuckLevel },
  { id: 'cross', number: 2, title: 'Крест', size: 'medium', create: createCrossLevel },
  { id: 'coming-3', number: 3, title: 'Скоро', size: 'medium', create: null },
];

export function playableLevel(id: string): LevelDef & { create: LevelFactory } {
  const found = LEVELS.find((level) => level.id === id);
  if (found === undefined || found.create === null) {
    throw new Error(`Level "${id}" is not playable`);
  }
  return found as LevelDef & { create: LevelFactory };
}
