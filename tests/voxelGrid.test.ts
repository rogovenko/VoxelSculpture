import { describe, expect, test } from 'vitest';
import { VoxelType } from '../src/domain/types';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import type { LevelData } from '../src/domain/levels/LevelData';

function packed(entries: number[]): Int32Array {
  return Int32Array.from(entries);
}

/** 3×3×3: marble shell, sculpture at the center. */
function makeCubeLevel(): LevelData {
  const voxels: number[] = [];
  for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const palette = x === 1 && y === 1 && z === 1 ? 2 : 1;
        voxels.push(x, y, z, palette);
      }
    }
  }
  return {
    version: 1,
    name: 'cube',
    size: [3, 3, 3],
    materials: { 1: 'marble', 2: 'sculpture' },
    voxels: packed(voxels),
  };
}

describe('VoxelGrid', () => {
  const grid = VoxelGrid.fromLevelData(makeCubeLevel(), 1, 1.4);

  test('indexOf and coordsOf are inverse, including corners', () => {
    const points: [number, number, number][] = [
      [0, 0, 0],
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
      [2, 2, 2],
      [1, 1, 1],
    ];
    for (const [x, y, z] of points) {
      const index = grid.indexOf(x, y, z);
      expect(grid.coordsOf(index)).toEqual([x, y, z]);
    }
  });

  test('inBounds is false for -1 and size on each axis', () => {
    expect(grid.inBounds(-1, 0, 0)).toBe(false);
    expect(grid.inBounds(3, 0, 0)).toBe(false);
    expect(grid.inBounds(0, -1, 0)).toBe(false);
    expect(grid.inBounds(0, 3, 0)).toBe(false);
    expect(grid.inBounds(0, 0, -1)).toBe(false);
    expect(grid.inBounds(0, 0, 3)).toBe(false);
    expect(grid.inBounds(0, 0, 0)).toBe(true);
  });

  test('typeAt outside bounds returns Air', () => {
    expect(grid.typeAt(-1, 0, 0)).toBe(VoxelType.Air);
    expect(grid.typeAt(3, 1, 1)).toBe(VoxelType.Air);
    expect(grid.typeAt(0, -1, 0)).toBe(VoxelType.Air);
    expect(grid.typeAt(0, 0, 3)).toBe(VoxelType.Air);
  });

  test('removeAt on marble decrements remaining and increments destroyed', () => {
    const local = VoxelGrid.fromLevelData(makeCubeLevel(), 1, 1.4);
    const remaining = local.marbleRemaining;
    const destroyed = local.marbleDestroyed;
    const index = local.indexOf(0, 0, 0);
    expect(local.type[index]).toBe(VoxelType.Marble);

    local.removeAt(index);

    expect(local.type[index]).toBe(VoxelType.Air);
    expect(local.marbleRemaining).toBe(remaining - 1);
    expect(local.marbleDestroyed).toBe(destroyed + 1);
  });

  test('removeAt on sculpture does not change type or counters', () => {
    const local = VoxelGrid.fromLevelData(makeCubeLevel(), 1, 1.4);
    const remaining = local.marbleRemaining;
    const destroyed = local.marbleDestroyed;
    const index = local.indexOf(1, 1, 1);
    expect(local.type[index]).toBe(VoxelType.Sculpture);

    local.removeAt(index);

    expect(local.type[index]).toBe(VoxelType.Sculpture);
    expect(local.marbleRemaining).toBe(remaining);
    expect(local.marbleDestroyed).toBe(destroyed);
  });

  test('hasAirNeighbour is true on the surface and false inside', () => {
    expect(grid.hasAirNeighbour(0, 0, 0)).toBe(true);
    expect(grid.hasAirNeighbour(1, 1, 1)).toBe(false);
  });
});
