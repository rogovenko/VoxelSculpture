import { VoxelType, type VoxelTypeValue } from './types';
import { validateLevelData, type LevelData, type MaterialName } from './levels/LevelData';

const NEIGHBOURS: readonly [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export class VoxelGrid {
  readonly size: readonly [number, number, number];
  readonly type: Uint8Array;
  readonly hp: Float32Array;
  readonly maxHp: Float32Array;

  marbleRemaining: number;
  marbleDestroyed: number;
  readonly sculptureTotal: number;

  private constructor(
    size: readonly [number, number, number],
    type: Uint8Array,
    hp: Float32Array,
    maxHp: Float32Array,
    marbleRemaining: number,
    sculptureTotal: number,
  ) {
    this.size = size;
    this.type = type;
    this.hp = hp;
    this.maxHp = maxHp;
    this.marbleRemaining = marbleRemaining;
    this.marbleDestroyed = 0;
    this.sculptureTotal = sculptureTotal;
  }

  static fromLevelData(data: LevelData, marbleHp: number, sculptureHp: number): VoxelGrid {
    validateLevelData(data);

    const [sx, sy, sz] = data.size;
    const count = sx * sy * sz;
    const type = new Uint8Array(count);
    const hp = new Float32Array(count);
    const maxHp = new Float32Array(count);

    let marbleRemaining = 0;
    let sculptureTotal = 0;

    for (let i = 0; i < data.voxels.length; i += 4) {
      const x = data.voxels[i];
      const y = data.voxels[i + 1];
      const z = data.voxels[i + 2];
      const paletteIndex = data.voxels[i + 3];
      const material: MaterialName = data.materials[paletteIndex];
      const index = x + y * sx + z * sx * sy;

      if (material === 'marble') {
        type[index] = VoxelType.Marble;
        hp[index] = marbleHp;
        maxHp[index] = marbleHp;
        marbleRemaining += 1;
      } else {
        type[index] = VoxelType.Sculpture;
        hp[index] = sculptureHp;
        maxHp[index] = sculptureHp;
        sculptureTotal += 1;
      }
    }

    return new VoxelGrid(data.size, type, hp, maxHp, marbleRemaining, sculptureTotal);
  }

  indexOf(x: number, y: number, z: number): number {
    const [sx, sy] = this.size;
    return x + y * sx + z * sx * sy;
  }

  inBounds(x: number, y: number, z: number): boolean {
    const [sx, sy, sz] = this.size;
    return x >= 0 && x < sx && y >= 0 && y < sy && z >= 0 && z < sz;
  }

  typeAt(x: number, y: number, z: number): VoxelTypeValue {
    if (!this.inBounds(x, y, z)) return VoxelType.Air;
    return this.type[this.indexOf(x, y, z)] as VoxelTypeValue;
  }

  isSolid(x: number, y: number, z: number): boolean {
    const t = this.typeAt(x, y, z);
    return t === VoxelType.Marble || t === VoxelType.Sculpture;
  }

  coordsOf(index: number): [number, number, number] {
    const [sx, sy] = this.size;
    const x = index % sx;
    const y = Math.floor(index / sx) % sy;
    const z = Math.floor(index / (sx * sy));
    return [x, y, z];
  }

  removeAt(index: number): void {
    if (this.type[index] !== VoxelType.Marble) return;
    this.type[index] = VoxelType.Air;
    this.hp[index] = 0;
    this.maxHp[index] = 0;
    this.marbleRemaining -= 1;
    this.marbleDestroyed += 1;
  }

  hasAirNeighbour(x: number, y: number, z: number): boolean {
    for (const [dx, dy, dz] of NEIGHBOURS) {
      if (this.typeAt(x + dx, y + dy, z + dz) === VoxelType.Air) return true;
    }
    return false;
  }
}
