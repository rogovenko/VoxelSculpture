/**
 * Упрощённый сидящий Будда → `assets/vox/buddha.vox`.
 * Масштаб как на референсе: лицо 8 клеток, высота ~34, база ~22.
 * MagicaVoxel: Z вверх, лицо на −Y (в игре смотрит на игрока с юга).
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeVox, type VoxColor, type VoxVoxel } from './writeVox';

const SKIN = 1;
const ROBE = 2;
const ROBE_D = 3;
const HAIR = 4;
const GOLD = 5;
const LIP = 6;

/** X ширина, Y глубина, Z высота. */
const SIZE = [24, 17, 34] as const;

const palette: VoxColor[] = [
  { r: 154, g: 158, b: 162, a: 255 },
  { r: 232, g: 118, b: 36, a: 255 },
  { r: 184, g: 78, b: 22, a: 255 },
  { r: 40, g: 42, b: 46, a: 255 },
  { r: 255, g: 220, b: 64, a: 255 },
  { r: 198, g: 200, b: 204, a: 255 },
];

const cells = new Map<string, number>();

function put(x: number, y: number, z: number, color: number): void {
  if (x < 0 || y < 0 || z < 0 || x >= SIZE[0] || y >= SIZE[1] || z >= SIZE[2]) return;
  cells.set(`${x},${y},${z}`, color);
}

function box(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  color: number,
): void {
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) put(x, y, z, color);
    }
  }
}

// --- скрещенные ноги / широкая оранжевая база ---
box(1, 22, 3, 14, 0, 4, ROBE);
box(2, 21, 2, 14, 1, 5, ROBE);
box(3, 20, 3, 13, 5, 6, ROBE);
for (let x = 1; x <= 22; x++) {
  for (let y = 3; y <= 14; y++) {
    if (x <= 2 || x >= 21 || y >= 13) put(x, y, 0, ROBE_D);
  }
}
box(4, 19, 4, 12, 6, 7, ROBE);

// --- торс и халат ---
box(5, 18, 4, 13, 8, 16, ROBE);
box(6, 17, 3, 13, 9, 16, ROBE);
box(4, 19, 5, 12, 10, 15, ROBE);
for (let x = 5; x <= 18; x++) {
  put(x, 13, 8, ROBE_D);
  put(x, 13, 9, ROBE_D);
}

// V-вырез: серая шея и грудь спереди
box(10, 13, 3, 6, 12, 17, SKIN);
box(9, 14, 4, 11, 16, 18, SKIN);
box(10, 13, 2, 5, 13, 17, SKIN);

// --- левая рука на коленях (малый X) ---
box(2, 6, 4, 10, 7, 11, ROBE);
box(1, 5, 3, 10, 8, 10, SKIN);
box(1, 5, 2, 8, 9, 10, SKIN);

// --- правая рука вверх, ладонь вперёд (−Y), ~3×4 ---
box(17, 21, 5, 11, 11, 16, ROBE);
box(18, 22, 4, 10, 14, 18, ROBE);
box(18, 22, 1, 4, 16, 20, SKIN);
box(19, 21, 1, 3, 16, 19, SKIN);

// --- голова: лицо 8 клеток (x 8..15) ---
box(8, 15, 4, 12, 19, 26, SKIN);
box(9, 14, 3, 12, 19, 26, SKIN);
box(8, 15, 2, 12, 20, 25, SKIN);

// уши + жёлтые мочки
box(7, 7, 6, 8, 20, 24, SKIN);
box(16, 16, 6, 8, 20, 24, SKIN);
put(7, 6, 20, GOLD);
put(7, 7, 20, GOLD);
put(16, 6, 20, GOLD);
put(16, 7, 20, GOLD);

// волосы и ушниша (3 в основании, кверху сужается)
box(8, 15, 4, 12, 26, 28, HAIR);
box(9, 14, 5, 12, 27, 29, HAIR);
box(10, 13, 6, 11, 29, 31, HAIR);
box(11, 12, 7, 10, 31, 32, HAIR);
put(11, 8, 33, HAIR);
put(12, 8, 33, HAIR);
box(9, 14, 2, 3, 19, 25, SKIN);

// лицо: глаза 2×1 с щелью, рот 2
put(9, 2, 24, GOLD);
put(10, 2, 24, GOLD);
put(13, 2, 24, GOLD);
put(14, 2, 24, GOLD);
put(11, 2, 22, LIP);
put(12, 2, 22, LIP);

const voxels: VoxVoxel[] = [...cells.entries()].map(([key, color]) => {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z, color };
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/vox/buddha.vox');
writeFileSync(out, encodeVox(SIZE, voxels, palette));
console.log(`wrote ${out} (${voxels.length} voxels, size ${SIZE.join('×')})`);
