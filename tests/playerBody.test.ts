import { describe, expect, test } from 'vitest';
import { aabb } from '../src/domain/Aabb';
import { CollisionWorld } from '../src/domain/CollisionWorld';
import { PlayerBody, type MoveIntent, type PlayerParams } from '../src/domain/PlayerBody';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import type { ArenaLayout } from '../src/domain/levels/arena';
import type { LevelData } from '../src/domain/levels/LevelData';
import { VoxelType } from '../src/domain/types';

const VOXEL = 0.25;

/** Габариты мировые, как в конфиге: по нынешнему вокселю это почти 4×12 клеток. */
const PARAMS: PlayerParams = {
  width: 0.95,
  height: 2.95,
  eyeHeight: 2.7,
  walkSpeed: 4.6,
  accel: 18,
  gravity: 28,
  jumpSpeed: 8,
  stepHeight: 0.525,
  maxFallSpeed: 40,
  climbSpeed: 2.4,
  crouchScale: 0.5,
};

const SIZE: [number, number, number] = [16, 24, 16];
const DT = 1 / 60;
const STILL: MoveIntent = {
  forward: 0,
  strafe: 0,
  yaw: 0,
  jump: false,
  crouch: false,
  climbDown: false,
};

/** Взгляд на -z, поэтому forward 1 везёт игрока в минус по z, а strafe 1 — в плюс по x. */
function intent(over: Partial<MoveIntent>): MoveIntent {
  return { ...STILL, ...over };
}

/** Сетка 16×24×16 по 0.25: в мире это x,z ∈ [-2, 2], основание на y = 0. */
function buildGrid(palette: (x: number, y: number, z: number) => number): VoxelGrid {
  const voxels: number[] = [];
  for (let z = 0; z < SIZE[2]; z++) {
    for (let y = 0; y < SIZE[1]; y++) {
      for (let x = 0; x < SIZE[0]; x++) {
        const material = palette(x, y, z);
        if (material > 0) voxels.push(x, y, z, material);
      }
    }
  }

  const data: LevelData = {
    version: 1,
    name: 'physics-test',
    size: SIZE,
    materials: { 1: 'marble', 2: 'sculpture' },
    voxels: Int32Array.from(voxels),
  };
  return VoxelGrid.fromLevelData(data, 1, 1.4);
}

function makeArena(
  extraBoxes: ArenaLayout['boxes'] = [],
  ladders: ArenaLayout['ladders'] = [],
): ArenaLayout {
  return {
    boxes: [{ kind: 'floor', ...aabb(-10, -0.5, -10, 10, 0, 10) }, ...extraBoxes],
    ladders,
    bounds: aabb(-10, -0.5, -10, 10, 20, 10),
    spawn: { x: 0, y: 0, z: 6, yawDeg: 0 },
    walkTops: [0],
    glybaMin: [-2, 0, -2],
    voxelSize: VOXEL,
  };
}

function makeWorld(
  palette: (x: number, y: number, z: number) => number,
  extraBoxes: ArenaLayout['boxes'] = [],
  ladders: ArenaLayout['ladders'] = [],
): CollisionWorld {
  return new CollisionWorld(buildGrid(palette), makeArena(extraBoxes, ladders));
}

function settle(body: PlayerBody, world: CollisionWorld, frames = 60): void {
  for (let i = 0; i < frames; i++) body.update(DT, STILL, world);
}

function walk(
  body: PlayerBody,
  world: CollisionWorld,
  move: Partial<MoveIntent>,
  frames: number,
): void {
  for (let i = 0; i < frames; i++) body.update(DT, intent(move), world);
}

describe('PlayerBody', () => {
  test('falls until it lands on the floor and becomes grounded', () => {
    const world = makeWorld(() => 0);
    const body = new PlayerBody(PARAMS);
    body.teleport(6, 5, 6);

    settle(body, world);

    expect(body.y).toBeCloseTo(0, 2);
    expect(body.grounded).toBe(true);
    expect(body.vy).toBe(0);
  });

  test('cannot walk into a solid column of marble', () => {
    // мрамор на x,z сетки < 8, то есть в мире x,z ∈ [-2, 0]
    const world = makeWorld((x, _y, z) => (x < 8 && z < 8 ? 1 : 0));
    const body = new PlayerBody(PARAMS);
    body.teleport(-1, 7, 3);
    settle(body, world);

    walk(body, world, { forward: 1 }, 120);

    expect(body.z).toBeGreaterThan(0.2);
  });

  test('cannot walk into the sculpture either', () => {
    const world = makeWorld((x, _y, z) => (x < 8 && z < 8 ? 2 : 0));
    const body = new PlayerBody(PARAMS);
    body.teleport(-1, 7, 3);
    settle(body, world);

    walk(body, world, { forward: 1 }, 120);

    expect(body.z).toBeGreaterThan(0.2);
    expect(world.intersects(body.box())).toBe(false);
  });

  test('stands on top of a sculpture cell instead of sinking into it', () => {
    const world = makeWorld((_x, y) => (y === 0 ? 2 : 0));
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 4, 0);

    settle(body, world);

    expect(body.y).toBeCloseTo(VOXEL, 2);
    expect(body.grounded).toBe(true);
  });

  test('steps up a single voxel automatically', () => {
    const world = makeWorld((_x, y, z) => (y === 0 && z >= 8 ? 1 : 0));
    const body = new PlayerBody(PARAMS);
    // ступенька занимает z сетки >= 8, то есть мир z ∈ [0, 2]; стартуем перед ней
    body.teleport(0, 0.2, 3);
    settle(body, world);
    expect(body.y).toBeCloseTo(0, 2);

    // дальше ступеньки нет, поэтому останавливаемся, не доходя до её края
    walk(body, world, { forward: 1 }, 25);

    expect(body.y).toBeCloseTo(VOXEL, 2);
    expect(body.z).toBeLessThan(2);
  });

  test('a ledge above step height stops the player', () => {
    // три клетки: шаг задан ростом игрока, поэтому в клетках он больше не равен единице
    const wall = [{ kind: 'structure' as const, ...aabb(-3, 0, -1, 3, 3 * VOXEL, 0) }];
    const world = makeWorld(() => 0, wall);
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 0.2, 3);
    settle(body, world);

    walk(body, world, { forward: 1 }, 120);

    expect(body.y).toBeCloseTo(0, 2);
    expect(body.z).toBeGreaterThan(-0.01);
  });

  test('jump works only from the ground', () => {
    const world = makeWorld(() => 0);
    const body = new PlayerBody(PARAMS);
    body.teleport(6, 0, 6);
    settle(body, world);

    body.update(DT, intent({ jump: true }), world);
    expect(body.y).toBeGreaterThan(0.05);

    const airborneY = body.y;
    body.update(DT, intent({ jump: true }), world);
    expect(body.vy).toBeLessThan(PARAMS.jumpSpeed);
    expect(body.y).toBeGreaterThan(airborneY);
  });

  test('never leaves the arena bounds', () => {
    const world = makeWorld(() => 0);
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 0, 6);
    settle(body, world);

    walk(body, world, { strafe: 1 }, 600);

    const half = PARAMS.width / 2;
    expect(body.x).toBeLessThanOrEqual(world.bounds.maxX - half + 1e-6);
  });

  test('needs full height clearance to enter a carved tunnel', () => {
    // выбито одиннадцать слоёв: 2.75 мировых единицы, ниже роста игрока
    const grid = buildGrid((_x, y) => (y < 11 ? 0 : 1));
    const world = new CollisionWorld(grid, makeArena());
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 0.2, 4);
    settle(body, world);

    walk(body, world, { forward: 1 }, 120);
    expect(body.z).toBeGreaterThan(2);

    for (let z = 0; z < SIZE[2]; z++) {
      for (let x = 0; x < SIZE[0]; x++) {
        grid.removeAt(grid.indexOf(x, 11, z));
      }
    }
    expect(grid.typeAt(0, 11, 0)).toBe(VoxelType.Air);

    walk(body, world, { forward: 1 }, 120);
    expect(body.z).toBeLessThan(1);
  });
});

describe('PlayerBody on a ladder', () => {
  const LADDER = [{ kind: 'ladder' as const, ...aabb(-1, 0, -0.3, 1, 6, 0) }];
  /** Вплотную к лестнице с той стороны, куда смотрит игрок при yaw = 0. */
  const AT_LADDER = PARAMS.width / 2;

  test('hangs in place without gravity while touching a ladder', () => {
    const world = makeWorld(() => 0, [], LADDER);
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 3, AT_LADDER);

    settle(body, world);

    expect(body.climbing).toBe(true);
    expect(body.y).toBeCloseTo(3, 5);
    expect(body.vy).toBe(0);
  });

  test('climbs up on forward and back down on crouch', () => {
    const world = makeWorld(() => 0, [], LADDER);
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 0, AT_LADDER);
    settle(body, world);

    walk(body, world, { forward: 1 }, 60);
    const climbed = body.y;
    expect(climbed).toBeGreaterThan(2);

    walk(body, world, { climbDown: true }, 30);
    expect(body.y).toBeLessThan(climbed - 0.5);
  });

  test('falls again after stepping off the ladder', () => {
    const world = makeWorld(() => 0, [], LADDER);
    const body = new PlayerBody(PARAMS);
    body.teleport(0, 0, AT_LADDER);
    settle(body, world);
    walk(body, world, { forward: 1 }, 60);
    expect(body.y).toBeGreaterThan(2);

    body.teleport(0, body.y, 3);
    settle(body, world);

    expect(body.climbing).toBe(false);
    expect(body.y).toBeCloseTo(0, 2);
    expect(body.grounded).toBe(true);
  });
});
