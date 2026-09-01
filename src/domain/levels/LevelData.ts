export type MaterialName = 'marble' | 'sculpture';

export interface LevelData {
  version: 1;
  name: string;
  size: [number, number, number];
  /** индекс палитры MagicaVoxel -> семантика игры */
  materials: Record<number, MaterialName>;
  /** упакованные четвёрки x, y, z, paletteIndex */
  voxels: Int32Array;
  /**
   * Авторский цвет клетки, 0xRRGGBB. Длина `sx * sy * sz`.
   * 0 — цвета из `.vox` нет, после заказа останется обычный зелёный.
   */
  paint?: Uint32Array;
}

export function validateLevelData(data: LevelData): void {
  if (data.version !== 1) {
    throw new Error(`LevelData.version must be 1, got ${data.version}`);
  }

  const [sx, sy, sz] = data.size;
  if (sx <= 0 || sy <= 0 || sz <= 0) {
    throw new Error(`LevelData.size must be positive, got [${sx}, ${sy}, ${sz}]`);
  }

  if (data.voxels.length % 4 !== 0) {
    throw new Error(`LevelData.voxels length must be a multiple of 4, got ${data.voxels.length}`);
  }

  for (let i = 0; i < data.voxels.length; i += 4) {
    const x = data.voxels[i];
    const y = data.voxels[i + 1];
    const z = data.voxels[i + 2];
    const paletteIndex = data.voxels[i + 3];

    if (x < 0 || x >= sx || y < 0 || y >= sy || z < 0 || z >= sz) {
      throw new Error(`Voxel coordinate [${x}, ${y}, ${z}] is outside size [${sx}, ${sy}, ${sz}]`);
    }

    if (!(paletteIndex in data.materials)) {
      throw new Error(`Unknown palette index ${paletteIndex} at [${x}, ${y}, ${z}]`);
    }
  }

  if (data.paint !== undefined && data.paint.length !== sx * sy * sz) {
    throw new Error(
      `LevelData.paint length must be ${sx * sy * sz}, got ${data.paint.length}`,
    );
  }
}
