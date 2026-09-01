import { describe, expect, test } from 'vitest';
import { VoxelType } from '../src/domain/types';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import { raycastVoxels } from '../src/domain/voxelRaycast';
import type { LevelData } from '../src/domain/levels/LevelData';

/** Сплошной куб мрамора заданного размера. */
function solidGrid(size: [number, number, number]): VoxelGrid {
  const [sx, sy, sz] = size;
  const voxels: number[] = [];
  for (let z = 0; z < sz; z++) {
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        voxels.push(x, y, z, 1);
      }
    }
  }
  const data: LevelData = {
    version: 1,
    name: 'solid',
    size,
    materials: { 1: 'marble' },
    voxels: Int32Array.from(voxels),
  };
  return VoxelGrid.fromLevelData(data, 1, 1.4);
}

const REACH = 40;

describe('raycastVoxels', () => {
  test('hits the nearest voxel along +X with face nx', () => {
    const grid = solidGrid([3, 3, 3]);
    const hit = raycastVoxels(grid, -5, 1.5, 1.5, 1, 0, 0, REACH);
    expect(hit).not.toBeNull();
    expect([hit!.x, hit!.y, hit!.z]).toEqual([0, 1, 1]);
    expect(hit!.face).toBe('nx');
    expect(hit!.type).toBe(VoxelType.Marble);
    expect(hit!.index).toBe(grid.indexOf(0, 1, 1));
  });

  test('hits the nearest voxel along -X with face px', () => {
    const grid = solidGrid([3, 3, 3]);
    const hit = raycastVoxels(grid, 8, 1.5, 1.5, -1, 0, 0, REACH);
    expect(hit).not.toBeNull();
    expect([hit!.x, hit!.y, hit!.z]).toEqual([2, 1, 1]);
    expect(hit!.face).toBe('px');
  });

  test('hits the nearest voxel along +Y and -Y with faces ny and py', () => {
    const grid = solidGrid([3, 3, 3]);

    const up = raycastVoxels(grid, 1.5, -5, 1.5, 0, 1, 0, REACH);
    expect(up).not.toBeNull();
    expect([up!.x, up!.y, up!.z]).toEqual([1, 0, 1]);
    expect(up!.face).toBe('ny');

    const down = raycastVoxels(grid, 1.5, 8, 1.5, 0, -1, 0, REACH);
    expect(down).not.toBeNull();
    expect([down!.x, down!.y, down!.z]).toEqual([1, 2, 1]);
    expect(down!.face).toBe('py');
  });

  test('hits the nearest voxel along +Z and -Z with faces nz and pz', () => {
    const grid = solidGrid([3, 3, 3]);

    const forward = raycastVoxels(grid, 1.5, 1.5, -5, 0, 0, 1, REACH);
    expect(forward).not.toBeNull();
    expect([forward!.x, forward!.y, forward!.z]).toEqual([1, 1, 0]);
    expect(forward!.face).toBe('nz');

    const back = raycastVoxels(grid, 1.5, 1.5, 8, 0, 0, -1, REACH);
    expect(back).not.toBeNull();
    expect([back!.x, back!.y, back!.z]).toEqual([1, 1, 2]);
    expect(back!.face).toBe('pz');
  });

  test('returns null when the ray misses the grid', () => {
    const grid = solidGrid([3, 3, 3]);
    expect(raycastVoxels(grid, -5, 10, 1.5, 1, 0, 0, REACH)).toBeNull();
    expect(raycastVoxels(grid, -5, 1.5, 1.5, -1, 0, 0, REACH)).toBeNull();
  });

  test('finds the starting voxel when the origin is inside the grid', () => {
    const grid = solidGrid([3, 3, 3]);
    const hit = raycastVoxels(grid, 1.5, 1.5, 1.5, 1, 0, 0, REACH);
    expect(hit).not.toBeNull();
    expect([hit!.x, hit!.y, hit!.z]).toEqual([1, 1, 1]);
  });

  test('flies through carved cells to the first solid one', () => {
    const grid = solidGrid([3, 3, 3]);
    grid.removeAt(grid.indexOf(0, 1, 1));
    grid.removeAt(grid.indexOf(1, 1, 1));

    const hit = raycastVoxels(grid, -5, 1.5, 1.5, 1, 0, 0, REACH);
    expect(hit).not.toBeNull();
    expect([hit!.x, hit!.y, hit!.z]).toEqual([2, 1, 1]);
    expect(hit!.face).toBe('nx');
  });

  test('returns null when maxDistance stops short of the grid', () => {
    const grid = solidGrid([3, 3, 3]);
    expect(raycastVoxels(grid, -5, 1.5, 1.5, 1, 0, 0, 2)).toBeNull();
  });

  test('diagonal ray hits an existing voxel inside bounds', () => {
    const grid = solidGrid([3, 3, 3]);
    const d = 1 / Math.sqrt(3);
    const hit = raycastVoxels(grid, -5, -5, -5, d, d, d, REACH);
    expect(hit).not.toBeNull();
    expect(grid.inBounds(hit!.x, hit!.y, hit!.z)).toBe(true);
    expect(grid.type[hit!.index]).toBe(VoxelType.Marble);
  });

  test('ray exactly on a cell boundary stays inside bounds', () => {
    const grid = solidGrid([3, 3, 3]);
    const hit = raycastVoxels(grid, -5, 1, 1, 1, 0, 0, REACH);
    expect(hit).not.toBeNull();
    expect(grid.inBounds(hit!.x, hit!.y, hit!.z)).toBe(true);
    expect(hit!.x).toBe(0);
  });
});
