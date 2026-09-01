declare module '*.vox' {
  const model: {
    size: [number, number, number];
    voxels: { x: number; y: number; z: number; color: number; r: number; g: number; b: number }[];
  };
  export default model;
}
