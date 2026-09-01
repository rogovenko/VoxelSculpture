import { describe, expect, test } from 'vitest';
import { computeScore, VERDICTS } from '../src/domain/ScoreSystem';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import type { LevelData } from '../src/domain/levels/LevelData';

const MARBLE_HP = 1;
const SCULPTURE_HP = 1.4;

/** Полоса из sculptureCount клеток оригинала плюс одна мраморная. */
function buildGrid(sculptureCount: number): VoxelGrid {
  const width = sculptureCount + 1;
  const voxels: number[] = [];
  for (let x = 0; x < width; x++) {
    voxels.push(x, 0, 0, x === 0 ? 1 : 2);
  }

  const data: LevelData = {
    version: 1,
    name: 'score-test',
    size: [width, 1, 1],
    materials: { 1: 'marble', 2: 'sculpture' },
    voxels: Int32Array.from(voxels),
  };
  return VoxelGrid.fromLevelData(data, MARBLE_HP, SCULPTURE_HP);
}

/** Добивает первые count клеток оригинала до нуля HP. */
function ruin(grid: VoxelGrid, count: number): void {
  for (let x = 1; x <= count; x++) {
    grid.hp[grid.indexOf(x, 0, 0)] = 0;
  }
}

describe('computeScore', () => {
  test('untouched sculpture earns the cleanest verdict', () => {
    const grid = buildGrid(10);
    const score = computeScore(grid, 1, 30);

    expect(score.sculptureRuined).toBe(0);
    expect(score.sculptureDamageAvg).toBe(0);
    expect(score.verdict).toBe(VERDICTS.intact);
  });

  test('light damage stays under the museum verdict', () => {
    const grid = buildGrid(10);
    ruin(grid, 1);
    expect(computeScore(grid, 1, 30).verdict).toBe(VERDICTS.light);
  });

  test('the 0.15 boundary itself is still light damage', () => {
    const grid = buildGrid(20);
    ruin(grid, 3);
    expect(computeScore(grid, 1, 30).verdict).toBe(VERDICTS.light);
  });

  test('damage above the boundary becomes modern art', () => {
    const grid = buildGrid(20);
    ruin(grid, 4);
    expect(computeScore(grid, 1, 30).verdict).toBe(VERDICTS.heavy);
  });

  test('every ruined cell earns the emotional verdict', () => {
    const grid = buildGrid(10);
    ruin(grid, 10);

    const score = computeScore(grid, 1, 30);
    expect(score.sculptureRuined).toBe(10);
    expect(score.sculptureDamageAvg).toBe(1);
    expect(score.verdict).toBe(VERDICTS.total);
  });

  test('partial damage counts as a fraction, not as zero', () => {
    const grid = buildGrid(2);
    grid.hp[grid.indexOf(1, 0, 0)] = SCULPTURE_HP / 2;

    const score = computeScore(grid, 1, 30);
    expect(score.sculptureRuined).toBe(0);
    expect(score.sculptureDamageAvg).toBeCloseTo(0.25, 5);
    expect(score.verdict).toBe(VERDICTS.intact);
  });

  test('marble counters and time pass through', () => {
    const grid = buildGrid(4);
    grid.removeAt(grid.indexOf(0, 0, 0));

    const score = computeScore(grid, 1, 92.5);
    expect(score.marbleDestroyed).toBe(1);
    expect(score.marbleTotal).toBe(1);
    expect(score.sculptureTotal).toBe(4);
    expect(score.timeSeconds).toBe(92.5);
  });
});
