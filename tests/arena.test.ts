import { describe, expect, test } from 'vitest';
import { CONFIG } from '../src/config';
import { aabbOverlaps, aabb } from '../src/domain/Aabb';
import { CollisionWorld } from '../src/domain/CollisionWorld';
import { VoxelGrid } from '../src/domain/VoxelGrid';
import { createArena, type ArenaLayout } from '../src/domain/levels/arena';
import { createCrossLevel } from '../src/domain/levels/crossLevel';

const SIZE = CONFIG.grid.sizes.medium;
const VOXEL = CONFIG.grid.voxelSize;
const REACH = CONFIG.chisel.reach;

/** Стоя вплотную к грани, игрок отстоит от неё на полширины. */
const HORIZONTAL_GAP = CONFIG.player.width / 2;
const SPOT_STEP = 0.25;
const SPOT_PROBE = 0.05;

interface Spot {
  x: number;
  eyeY: number;
  z: number;
}

function build(): ArenaLayout {
  return createArena(SIZE, CONFIG.arena, VOXEL);
}

function worldFor(arena: ArenaLayout): CollisionWorld {
  const grid = VoxelGrid.fromLevelData(
    createCrossLevel(SIZE),
    CONFIG.chisel.marbleHp,
    CONFIG.chisel.sculptureHp,
  );
  return new CollisionWorld(grid, arena);
}

/** Позиции, где игрок реально может стоять: тело в пустоте, под ногами опора. */
function standingSpots(arena: ArenaLayout, world: CollisionWorld): Spot[] {
  const half = CONFIG.player.width / 2;
  const steps = Math.floor((arena.bounds.maxX - arena.bounds.minX - 2 * half) / SPOT_STEP);
  const spots: Spot[] = [];

  for (const top of arena.walkTops) {
    for (let i = 0; i <= steps; i++) {
      const x = arena.bounds.minX + half + i * SPOT_STEP;
      for (let j = 0; j <= steps; j++) {
        const z = arena.bounds.minZ + half + j * SPOT_STEP;
        const body = aabb(x - half, top, z - half, x + half, top + CONFIG.player.height, z + half);
        if (world.intersects(body)) continue;
        const feet = aabb(x - half, top - SPOT_PROBE, z - half, x + half, top, z + half);
        if (!world.intersects(feet)) continue;
        spots.push({ x, eyeY: top + CONFIG.player.eyeHeight, z });
      }
    }
  }

  return spots;
}

function reachable(spots: readonly Spot[], x: number, y: number, z: number): boolean {
  return spots.some((spot) => Math.hypot(spot.x - x, spot.eyeY - y, spot.z - z) <= REACH);
}

/** Центры внешних граней глыбы, кроме подошвы: до неё не добраться и не нужно. */
function shellFaceCentres(
  arena: ArenaLayout,
): { label: string; x: number; y: number; z: number }[] {
  const [ox, oy, oz] = arena.glybaMin;
  const [sx, sy, sz] = SIZE;
  const points: { label: string; x: number; y: number; z: number }[] = [];

  for (let y = 0; y < sy; y++) {
    for (let z = 0; z < sz; z++) {
      const cy = oy + (y + 0.5) * VOXEL;
      const cz = oz + (z + 0.5) * VOXEL;
      points.push({ label: `+x y${y} z${z}`, x: ox + sx * VOXEL, y: cy, z: cz });
      points.push({ label: `-x y${y} z${z}`, x: ox, y: cy, z: cz });
    }
    for (let x = 0; x < sx; x++) {
      const cx = ox + (x + 0.5) * VOXEL;
      const cy = oy + (y + 0.5) * VOXEL;
      points.push({ label: `+z y${y} x${x}`, x: cx, y: cy, z: oz + sz * VOXEL });
      points.push({ label: `-z y${y} x${x}`, x: cx, y: cy, z: oz });
    }
  }

  for (let z = 0; z < sz; z++) {
    for (let x = 0; x < sx; x++) {
      points.push({
        label: `+y x${x} z${z}`,
        x: ox + (x + 0.5) * VOXEL,
        y: oy + sy * VOXEL,
        z: oz + (z + 0.5) * VOXEL,
      });
    }
  }

  return points;
}

describe('createArena', () => {
  test('every glyba layer is within reach from at least one walk level', () => {
    const arena = build();
    const verticalReach = Math.sqrt(REACH ** 2 - HORIZONTAL_GAP ** 2);

    for (let layer = 0; layer < SIZE[1]; layer++) {
      const centreY = arena.glybaMin[1] + (layer + 0.5) * VOXEL;
      const reachableLayer = arena.walkTops.some((top) => {
        const eyeY = top + CONFIG.player.eyeHeight;
        return Math.abs(centreY - eyeY) <= verticalReach;
      });

      expect(reachableLayer, `слой ${layer} не достаётся ни с одного уровня`).toBe(true);
    }
  });

  /**
   * Ключевой инвариант проходимости: леса стоят лишь с двух сторон, и только вместе
   * они покрывают всю оболочку. Дальше долбёжка идёт вглубь, то есть всегда ближе.
   */
  test('the whole outer shell of the glyba can be hit from somewhere', () => {
    const arena = build();
    const spots = standingSpots(arena, worldFor(arena));
    expect(spots.length).toBeGreaterThan(0);

    const unreachable = shellFaceCentres(arena).filter(
      (point) => !reachable(spots, point.x, point.y, point.z),
    );

    expect(unreachable.map((point) => point.label)).toEqual([]);
  });

  test('the player fits under the scaffold deck', () => {
    const arena = build();
    const deckBottom =
      Math.min(...arena.walkTops.filter((top) => top > 0)) - CONFIG.arena.plateThickness;
    expect(deckBottom).toBeGreaterThan(CONFIG.player.height);
  });

  test('every scaffold side carries a ladder on both flanks', () => {
    const arena = build();
    expect(arena.ladders).toHaveLength(4);

    const topDeck = Math.max(...arena.walkTops);
    for (const ladder of arena.ladders) {
      expect(ladder.kind).toBe('ladder');
      expect(ladder.minY).toBeLessThanOrEqual(0);
      expect(ladder.maxY).toBe(topDeck);
    }

    const corners = new Set(
      arena.ladders.map(
        (ladder) =>
          `${Math.sign(ladder.minX + ladder.maxX)}:${Math.sign(ladder.minZ + ladder.maxZ)}`,
      ),
    );
    expect(corners.size).toBe(4);
  });

  test('a ladder can be gripped from the outside and blocks the way through', () => {
    const arena = build();
    const world = worldFor(arena);
    const half = CONFIG.player.width / 2;

    for (const ladder of arena.ladders) {
      const outward = Math.sign(ladder.minX + ladder.maxX);
      const faceX = outward > 0 ? ladder.maxX : ladder.minX;
      const x = faceX + outward * half;
      const z = (ladder.minZ + ladder.maxZ) / 2;
      const climbHeight = Math.max(...arena.walkTops) - 1;
      const body = aabb(
        x - half,
        climbHeight,
        z - half,
        x + half,
        climbHeight + CONFIG.player.height,
        z + half,
      );

      expect(world.intersects(body), 'снаружи лестницы не встать').toBe(false);
      expect(world.onLadder(body), 'вплотную к лестнице не хватаешься').toBe(true);

      const inside = aabb(
        ladder.minX + 0.01,
        climbHeight,
        z - half,
        ladder.maxX - 0.01,
        climbHeight + CONFIG.player.height,
        z + half,
      );
      expect(world.intersects(inside), 'лестница пропускает сквозь себя').toBe(true);
    }
  });

  test('walk levels are ordered and start at the ground', () => {
    const arena = build();
    expect(arena.walkTops[0]).toBe(0);
    for (let i = 1; i < arena.walkTops.length; i++) {
      expect(arena.walkTops[i]).toBeGreaterThan(arena.walkTops[i - 1]);
    }
  });

  test('spawn is free of geometry and stands on a support', () => {
    const arena = build();
    const half = CONFIG.player.width / 2;
    const { x, y, z } = arena.spawn;

    const body = aabb(x - half, y, z - half, x + half, y + CONFIG.player.height, z + half);
    for (const solid of arena.boxes) {
      expect(aabbOverlaps(body, solid), 'спавн внутри геометрии').toBe(false);
    }

    const probe = aabb(x - half, y - SPOT_PROBE, z - half, x + half, y, z + half);
    expect(arena.boxes.some((solid) => aabbOverlaps(probe, solid))).toBe(true);
  });

  test('arena is closed: bounds sit inside the walls', () => {
    const arena = build();
    expect(arena.bounds.minX).toBe(-CONFIG.arena.halfExtent);
    expect(arena.bounds.maxX).toBe(CONFIG.arena.halfExtent);
    expect(arena.bounds.minZ).toBe(-CONFIG.arena.halfExtent);
    expect(arena.bounds.maxZ).toBe(CONFIG.arena.halfExtent);
  });

  test('solid boxes never overlap each other', () => {
    const arena = build();
    for (let i = 0; i < arena.boxes.length; i++) {
      for (let j = i + 1; j < arena.boxes.length; j++) {
        expect(
          aabbOverlaps(arena.boxes[i], arena.boxes[j]),
          `коробки ${i} и ${j} пересекаются`,
        ).toBe(false);
      }
    }
  });
});
