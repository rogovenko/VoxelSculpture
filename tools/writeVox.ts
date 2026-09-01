/**
 * MagicaVoxel .vox (version 150): MAIN + SIZE + XYZI + RGBA.
 * Здесь Z — вверх, как в MagicaVoxel. Вызывающий сам перекладывает оси.
 */
export interface VoxVoxel {
  x: number;
  y: number;
  z: number;
  /** 1..255, индекс в палитре (1 = первый цвет RGBA). */
  color: number;
}

export interface VoxColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function chunk(
  id: string,
  content: Uint8Array,
  children: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const out = new Uint8Array(12 + content.length + children.length);
  const view = new DataView(out.buffer);
  out[0] = id.charCodeAt(0);
  out[1] = id.charCodeAt(1);
  out[2] = id.charCodeAt(2);
  out[3] = id.charCodeAt(3);
  view.setInt32(4, content.length, true);
  view.setInt32(8, children.length, true);
  out.set(content, 12);
  out.set(children, 12 + content.length);
  return out;
}

function i32(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((value, i) => view.setInt32(i * 4, value, true));
  return out;
}

export function encodeVox(
  size: readonly [number, number, number],
  voxels: readonly VoxVoxel[],
  palette: readonly VoxColor[],
): Uint8Array {
  const [sx, sy, sz] = size;
  const sizeChunk = chunk('SIZE', i32(sx, sy, sz));

  const xyzi = new Uint8Array(4 + voxels.length * 4);
  new DataView(xyzi.buffer).setInt32(0, voxels.length, true);
  voxels.forEach((voxel, i) => {
    const o = 4 + i * 4;
    xyzi[o] = voxel.x;
    xyzi[o + 1] = voxel.y;
    xyzi[o + 2] = voxel.z;
    xyzi[o + 3] = voxel.color;
  });
  const xyziChunk = chunk('XYZI', xyzi);

  const rgba = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const color = palette[i] ?? { r: 0, g: 0, b: 0, a: 255 };
    const o = i * 4;
    rgba[o] = color.r;
    rgba[o + 1] = color.g;
    rgba[o + 2] = color.b;
    rgba[o + 3] = color.a ?? 255;
  }
  const rgbaChunk = chunk('RGBA', rgba);

  const children = new Uint8Array(sizeChunk.length + xyziChunk.length + rgbaChunk.length);
  children.set(sizeChunk, 0);
  children.set(xyziChunk, sizeChunk.length);
  children.set(rgbaChunk, sizeChunk.length + xyziChunk.length);

  const main = chunk('MAIN', new Uint8Array(0), children);

  const file = new Uint8Array(8 + main.length);
  file.set([0x56, 0x4f, 0x58, 0x20]); // "VOX "
  new DataView(file.buffer).setInt32(4, 150, true);
  file.set(main, 8);
  return file;
}
