import { describe, expect, test } from 'vitest';
import { VoxelType } from '../src/domain/types';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import { validateLevelData } from '../src/domain/levels/LevelData';
import { createCrossLevel } from '../src/domain/levels/crossLevel';

function assertCrossLevel(size: [number, number, number]): void {
  const data = createCrossLevel(size);
  expect(() => validateLevelData(data)).not.toThrow();

  const [sx, sy, sz] = size;
  expect(data.voxels.length / 4).toBe(sx * sy * sz);

  const grid = VoxelGrid.fromLevelData(data, 1, 1.4);
  expect(grid.marbleRemaining + grid.sculptureTotal).toBe(sx * sy * sz);

  for (let z = 0; z < sz; z++) {
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        const type = grid.typeAt(x, y, z);
        expect(grid.typeAt(sx - 1 - x, y, z)).toBe(type);
        expect(grid.typeAt(x, y, sz - 1 - z)).toBe(type);

        if (type !== VoxelType.Sculpture) continue;

        const onBoundary = x === 0 || x === sx - 1 || y === 0 || y === sy - 1 || z === 0 || z === sz - 1;
        expect(onBoundary).toBe(false);
        expect(grid.hasAirNeighbour(x, y, z)).toBe(false);
      }
    }
  }
}

describe('createCrossLevel', () => {
  test('matches the documented ranges of the original 7×7×12 grid', () => {
    // Опорная раскладка: доли формы взяты отсюда, поэтому на этой сетке она обязана
    // совпадать клетка в клетку. Рабочая сетка вдвое мельче, фигура та же.
    const data = createCrossLevel([7, 12, 7]);
    const grid = VoxelGrid.fromLevelData(data, 1, 1.4);

    expect(grid.typeAt(2, 2, 2)).toBe(VoxelType.Sculpture);
    expect(grid.typeAt(4, 9, 4)).toBe(VoxelType.Sculpture);
    expect(grid.typeAt(1, 6, 2)).toBe(VoxelType.Sculpture);
    expect(grid.typeAt(5, 7, 4)).toBe(VoxelType.Sculpture);

    expect(grid.typeAt(2, 1, 2)).toBe(VoxelType.Marble);
    expect(grid.typeAt(2, 10, 2)).toBe(VoxelType.Marble);
    expect(grid.typeAt(0, 6, 3)).toBe(VoxelType.Marble);
  });

  test('7×7×12 is valid, solid, symmetric and fully enclosed', () => {
    assertCrossLevel([7, 12, 7]);
  });

  test('9×9×16 is valid, solid, symmetric and fully enclosed', () => {
    assertCrossLevel([9, 16, 9]);
  });
});
