import { aabb, aabbOverlaps, type Aabb } from './Aabb';
import type { ArenaLayout } from './levels/arena';
import type { VoxelGrid } from './VoxelGrid';

/**
 * Лестница сплошная, поэтому хват срабатывает по касанию, а не по пересечению.
 * Вниз запрос тоже растянут: верх опоры совпадает с настилом, и без этого зазора
 * игрок терял бы хват ровно на последнем шаге подъёма и съезжал обратно.
 */
const LADDER_GRIP = 0.1;

export class CollisionWorld {
  readonly bounds: Aabb;

  private readonly statics: readonly Aabb[];
  private readonly ladders: readonly Aabb[];
  private readonly originX: number;
  private readonly originY: number;
  private readonly originZ: number;
  private readonly voxelSize: number;

  constructor(
    private readonly grid: VoxelGrid,
    arena: ArenaLayout,
  ) {
    this.statics = arena.boxes;
    this.ladders = arena.ladders;
    this.bounds = arena.bounds;
    this.voxelSize = arena.voxelSize;

    const [ox, oy, oz] = arena.glybaMin;
    this.originX = ox;
    this.originY = oy;
    this.originZ = oz;
  }

  intersects(box: Aabb): boolean {
    return this.intersectsStatics(box) || this.intersectsVoxels(box);
  }

  onLadder(box: Aabb): boolean {
    const grip = aabb(
      box.minX - LADDER_GRIP,
      box.minY - LADDER_GRIP,
      box.minZ - LADDER_GRIP,
      box.maxX + LADDER_GRIP,
      box.maxY,
      box.maxZ + LADDER_GRIP,
    );
    for (const ladder of this.ladders) {
      if (aabbOverlaps(grip, ladder)) return true;
    }
    return false;
  }

  private intersectsStatics(box: Aabb): boolean {
    for (const solid of this.statics) {
      if (aabbOverlaps(box, solid)) return true;
    }
    for (const ladder of this.ladders) {
      if (aabbOverlaps(box, ladder)) return true;
    }
    return false;
  }

  private intersectsVoxels(box: Aabb): boolean {
    const s = this.voxelSize;
    const x0 = Math.floor((box.minX - this.originX) / s);
    const x1 = Math.ceil((box.maxX - this.originX) / s) - 1;
    const y0 = Math.floor((box.minY - this.originY) / s);
    const y1 = Math.ceil((box.maxY - this.originY) / s) - 1;
    const z0 = Math.floor((box.minZ - this.originZ) / s);
    const z1 = Math.ceil((box.maxZ - this.originZ) / s) - 1;

    for (let z = z0; z <= z1; z++) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (this.grid.isSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }
}
