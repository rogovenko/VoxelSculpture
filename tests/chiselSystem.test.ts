import { describe, expect, test } from 'vitest';
import { ChiselSystem } from '../src/domain/ChiselSystem';
import { GameEvents } from '../src/domain/GameEvents';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import { VoxelType, type HitResult, type SolidVoxelType } from '../src/domain/types';
import type { LevelData } from '../src/domain/levels/LevelData';

const DPS = 2.5;
const MARBLE_HP = 1;
const SCULPTURE_HP = 1.4;
const STAGES = 8;

function buildGrid(
  size: [number, number, number],
  palette: (x: number, y: number, z: number) => number,
): VoxelGrid {
  const [sx, sy, sz] = size;
  const voxels: number[] = [];
  for (let z = 0; z < sz; z++) {
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        voxels.push(x, y, z, palette(x, y, z));
      }
    }
  }
  const data: LevelData = {
    version: 1,
    name: 'test',
    size,
    materials: { 1: 'marble', 2: 'sculpture' },
    voxels: Int32Array.from(voxels),
  };
  return VoxelGrid.fromLevelData(data, MARBLE_HP, SCULPTURE_HP);
}

function hitAt(grid: VoxelGrid, x: number, y: number, z: number): HitResult {
  const index = grid.indexOf(x, y, z);
  return {
    x,
    y,
    z,
    index,
    type: grid.type[index] as SolidVoxelType,
    face: 'py',
    distance: 1,
  };
}

interface Fixture {
  grid: VoxelGrid;
  events: GameEvents;
  chisel: ChiselSystem;
}

function makeFixture(palette: (x: number, y: number, z: number) => number = () => 1): Fixture {
  const grid = buildGrid([3, 1, 1], palette);
  const events = new GameEvents();
  const chisel = new ChiselSystem(grid, events, DPS, STAGES);
  return { grid, events, chisel };
}

describe('ChiselSystem', () => {
  test('holding on marble subtracts dps * dt', () => {
    const { grid, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    chisel.update(0.1, hit);
    expect(grid.hp[hit.index]).toBeCloseTo(MARBLE_HP - DPS * 0.1, 5);
  });

  test('marble breaks in roughly maxHp / dps seconds', () => {
    const { grid, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();

    const dt = 0.01;
    let elapsed = 0;
    while (grid.type[hit.index] !== VoxelType.Air && elapsed < 5) {
      chisel.update(dt, hit);
      elapsed += dt;
    }

    expect(grid.type[hit.index]).toBe(VoxelType.Air);
    expect(elapsed).toBeCloseTo(MARBLE_HP / DPS, 1);
  });

  test('stop() keeps the damage already dealt', () => {
    const { grid, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    chisel.update(0.2, hit);
    const damaged = grid.hp[hit.index];
    expect(damaged).toBeLessThan(MARBLE_HP);

    chisel.stop();
    expect(grid.hp[hit.index]).toBe(damaged);
  });

  test('damage accumulates across separate chisel sessions', () => {
    const { grid, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);

    chisel.begin();
    chisel.update(0.2, hit);
    chisel.stop();
    const afterFirst = grid.hp[hit.index];

    chisel.begin();
    chisel.update(0.2, hit);
    expect(grid.hp[hit.index]).toBeLessThan(afterFirst);
  });

  test('switching target keeps the damage of the previous marble cell', () => {
    const { grid, chisel } = makeFixture();
    const first = hitAt(grid, 0, 0, 0);
    const second = hitAt(grid, 1, 0, 0);
    chisel.begin();
    chisel.update(0.2, first);
    const damaged = grid.hp[first.index];
    expect(damaged).toBeLessThan(MARBLE_HP);

    chisel.update(0.05, second);
    expect(grid.hp[first.index]).toBe(damaged);
    expect(grid.hp[second.index]).toBeLessThan(MARBLE_HP);
  });

  test('losing the target keeps the damage', () => {
    const { grid, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    chisel.update(0.2, hit);
    const damaged = grid.hp[hit.index];
    chisel.update(0.05, null);
    expect(grid.hp[hit.index]).toBe(damaged);
  });

  test('sculpture is never removed when hp drops to zero', () => {
    const { grid, chisel } = makeFixture(() => 2);
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    for (let i = 0; i < 200; i++) chisel.update(0.05, hit);

    expect(grid.type[hit.index]).toBe(VoxelType.Sculpture);
    expect(grid.hp[hit.index]).toBe(0);
  });

  test('sculpture damage is permanent across stop()', () => {
    const { grid, chisel } = makeFixture(() => 2);
    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    chisel.update(0.2, hit);
    const damaged = grid.hp[hit.index];
    expect(damaged).toBeLessThan(SCULPTURE_HP);

    chisel.stop();
    expect(grid.hp[hit.index]).toBe(damaged);
  });

  test('sculptureRuined is emitted exactly once per cell', () => {
    const { grid, events, chisel } = makeFixture(() => 2);
    const hit = hitAt(grid, 0, 0, 0);
    let ruined = 0;
    events.on('sculptureRuined', () => {
      ruined += 1;
    });

    chisel.begin();
    for (let i = 0; i < 200; i++) chisel.update(0.05, hit);

    expect(ruined).toBe(1);
  });

  test('levelCompleted fires when the last marble cell is removed', () => {
    const grid = buildGrid([2, 1, 1], (x) => (x === 0 ? 1 : 2));
    const events = new GameEvents();
    const chisel = new ChiselSystem(grid, events, DPS, STAGES);
    let completed = 0;
    events.on('levelCompleted', () => {
      completed += 1;
    });

    const hit = hitAt(grid, 0, 0, 0);
    chisel.begin();
    for (let i = 0; i < 20 && grid.marbleRemaining > 0; i++) chisel.update(0.05, hit);

    expect(grid.marbleRemaining).toBe(0);
    expect(completed).toBe(1);
  });

  test('crack stage grows monotonically and stays in range', () => {
    const { grid, events, chisel } = makeFixture();
    const hit = hitAt(grid, 0, 0, 0);
    const stages: number[] = [];
    events.on('voxelDamaged', ({ stage }) => {
      stages.push(stage);
    });

    chisel.begin();
    while (grid.type[hit.index] !== VoxelType.Air) {
      chisel.update(0.01, hit);
    }

    expect(stages.length).toBeGreaterThan(4);
    expect(stages[0]).toBe(0);
    expect(stages[stages.length - 1]).toBeLessThanOrEqual(STAGES - 1);
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1]);
      expect(stages[i]).toBeLessThanOrEqual(STAGES - 1);
      expect(stages[i]).toBeGreaterThanOrEqual(0);
    }
  });
});
