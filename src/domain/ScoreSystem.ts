import { VoxelType } from './types';
import type { VoxelGrid } from './VoxelGrid';

export interface ScoreResult {
  marbleDestroyed: number;
  marbleTotal: number;
  sculptureTotal: number;
  /** клетки оригинала, доведённые до нуля HP */
  sculptureRuined: number;
  /** средняя доля потерянного HP по всем клеткам оригинала, 0..1 */
  sculptureDamageAvg: number;
  timeSeconds: number;
  verdict: string;
}

export const VERDICTS = {
  intact: 'Микеланджело нервно курит в стороне',
  light: 'Музей возьмёт, но реставратор проклянёт',
  heavy: 'Это уже современное искусство',
  total: 'Крест получился. Эмоционально',
} as const;

const LIGHT_DAMAGE_LIMIT = 0.15;

export function computeScore(
  grid: VoxelGrid,
  marbleTotal: number,
  timeSeconds: number,
): ScoreResult {
  let sculptureTotal = 0;
  let sculptureRuined = 0;
  let damageSum = 0;

  for (let i = 0; i < grid.type.length; i++) {
    if (grid.type[i] !== VoxelType.Sculpture) continue;
    sculptureTotal += 1;

    const maxHp = grid.maxHp[i];
    const lost = maxHp > 0 ? 1 - grid.hp[i] / maxHp : 1;
    damageSum += lost < 0 ? 0 : lost > 1 ? 1 : lost;
    if (grid.hp[i] <= 0) sculptureRuined += 1;
  }

  const ruinedRatio = sculptureTotal > 0 ? sculptureRuined / sculptureTotal : 0;

  return {
    marbleDestroyed: grid.marbleDestroyed,
    marbleTotal,
    sculptureTotal,
    sculptureRuined,
    sculptureDamageAvg: sculptureTotal > 0 ? damageSum / sculptureTotal : 0,
    timeSeconds,
    verdict: verdictFor(ruinedRatio),
  };
}

function verdictFor(ruinedRatio: number): string {
  if (ruinedRatio === 0) return VERDICTS.intact;
  if (ruinedRatio <= LIGHT_DAMAGE_LIMIT) return VERDICTS.light;
  if (ruinedRatio < 1) return VERDICTS.heavy;
  return VERDICTS.total;
}
