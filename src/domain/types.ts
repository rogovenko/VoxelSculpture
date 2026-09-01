export const VoxelType = {
  Air: 0,
  Marble: 1,
  Sculpture: 2,
} as const;

export type VoxelTypeValue = (typeof VoxelType)[keyof typeof VoxelType];
export type SolidVoxelType = typeof VoxelType.Marble | typeof VoxelType.Sculpture;

export type Face = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export interface HitResult {
  x: number;
  y: number;
  z: number;
  index: number;
  type: SolidVoxelType;
  face: Face;
  distance: number;
}
