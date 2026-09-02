/**
 * Тотем (орёл → волк → медведь) → `assets/vox/totem.vox`.
 * MagicaVoxel: Z вверх, лицо на −Y (в игре смотрит на игрока с юга).
 * Крылья висят вниз; только осевые кубы.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeVox, type VoxColor, type VoxVoxel } from './writeVox';

const WOOD = 1;
const WOOD_D = 2;
const TEAL = 3;
const RED = 4;
const YELLOW = 5;
const TAN = 6;
const WHITE = 7;
const GREY = 8;
const LIME = 9;
const BLACK = 10;

/** X ширина (с крыльями), Y глубина, Z высота. */
const SIZE = [22, 15, 50] as const;

const palette: VoxColor[] = [
  { r: 74, g: 42, b: 28, a: 255 },
  { r: 48, g: 26, b: 18, a: 255 },
  { r: 32, g: 160, b: 168, a: 255 },
  { r: 196, g: 36, b: 36, a: 255 },
  { r: 236, g: 188, b: 40, a: 255 },
  { r: 196, g: 154, b: 104, a: 255 },
  { r: 236, g: 236, b: 232, a: 255 },
  { r: 120, g: 120, b: 124, a: 255 },
  { r: 92, g: 160, b: 52, a: 255 },
  { r: 18, g: 14, b: 12, a: 255 },
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

function eye(cx: number, y: number, z: number): void {
  box(cx - 1, cx + 2, y, y, z - 1, z + 1, TEAL);
  box(cx, cx + 1, y, y, z, z + 1, WHITE);
  put(cx, y, z + 1, BLACK);
}

function brow(x0: number, x1: number, y: number, z: number): void {
  box(x0, x1, y, y, z, z, RED);
}

function teeth(x0: number, x1: number, y: number, z: number): void {
  for (let x = x0; x <= x1; x++) put(x, y, z, WHITE);
}

function zigzag(z: number, y0: number, y1: number, x0: number, x1: number, a: number, b: number): void {
  for (let x = x0; x <= x1; x++) {
    const color = (x - x0) % 2 === 0 ? a : b;
    box(x, x, y0, y1, z, z, color);
  }
}

// --- база: два квадратных яруса ---
box(4, 17, 3, 12, 0, 1, TEAL);
zigzag(0, 3, 3, 4, 17, YELLOW, TEAL);
zigzag(0, 12, 12, 4, 17, YELLOW, TEAL);
zigzag(1, 3, 3, 4, 17, RED, TEAL);
box(5, 16, 4, 11, 2, 3, TEAL);
zigzag(2, 4, 4, 5, 16, RED, TEAL);
zigzag(3, 4, 4, 5, 16, YELLOW, TEAL);

// --- столб-ядро ---
box(6, 15, 4, 11, 4, 47, WOOD);
box(6, 15, 11, 12, 4, 47, WOOD_D);

// ========== МЕДВЕДЬ z 4–16 ==========
box(5, 16, 3, 12, 4, 16, WOOD);
box(5, 16, 2, 3, 6, 16, WOOD);

// морда
box(8, 13, 1, 3, 8, 13, TAN);
box(9, 12, 0, 1, 9, 12, TAN);
put(10, 0, 12, WOOD_D);
put(11, 0, 12, WOOD_D);

// пасть и зубы
box(8, 13, 1, 2, 8, 10, WOOD);
teeth(8, 13, 1, 9);
teeth(8, 13, 1, 10);

// глаза и брови
eye(7, 2, 14);
eye(13, 2, 14);
brow(6, 10, 2, 16);
brow(12, 16, 2, 16);
box(5, 6, 3, 5, 15, 16, RED);
box(15, 16, 3, 5, 15, 16, RED);

// серьги / клыки по бокам
box(3, 5, 4, 8, 6, 10, GREY);
box(16, 18, 4, 8, 6, 10, GREY);

// полосы по бокам
box(5, 5, 5, 10, 8, 8, YELLOW);
box(5, 5, 5, 10, 10, 10, TEAL);
box(5, 5, 5, 10, 12, 12, RED);
box(16, 16, 5, 10, 8, 8, YELLOW);
box(16, 16, 5, 10, 10, 10, TEAL);
box(16, 16, 5, 10, 12, 12, RED);

// ========== ВОЛК z 17–31 ==========
box(6, 15, 3, 12, 17, 31, WOOD);
box(6, 15, 2, 3, 18, 30, WOOD);

// уши ступенькой (не треугольники)
box(6, 8, 6, 10, 29, 30, WOOD);
box(6, 7, 7, 10, 31, 31, LIME);
put(6, 8, 31, YELLOW);
box(13, 15, 6, 10, 29, 30, WOOD);
box(14, 15, 7, 10, 31, 31, LIME);
put(15, 8, 31, YELLOW);
box(6, 8, 7, 9, 29, 30, RED);
box(13, 15, 7, 9, 29, 30, RED);

// морда длиннее
box(8, 13, 1, 3, 20, 26, TAN);
box(9, 12, 0, 1, 21, 25, TAN);
put(10, 0, 25, WOOD_D);
put(11, 0, 25, WOOD_D);

// зубы и язык вниз
teeth(9, 12, 1, 20);
box(10, 11, 1, 2, 17, 21, RED);

eye(7, 2, 27);
eye(13, 2, 27);
brow(6, 10, 2, 29);
brow(12, 16, 2, 29);

// щёки
box(6, 7, 3, 5, 22, 24, LIME);
box(14, 15, 3, 5, 22, 24, LIME);
box(6, 7, 3, 5, 25, 25, YELLOW);
box(14, 15, 3, 5, 25, 25, YELLOW);

box(6, 6, 5, 10, 21, 21, TEAL);
box(15, 15, 5, 10, 21, 21, TEAL);
box(6, 6, 5, 10, 23, 23, RED);
box(15, 15, 5, 10, 23, 23, RED);

// ========== ОРЁЛ z 32–47 ==========
box(6, 15, 3, 12, 32, 47, WOOD);
box(6, 15, 2, 3, 33, 46, WOOD);

// клюв ступеньками
box(9, 12, 2, 3, 39, 42, YELLOW);
box(8, 13, 1, 3, 38, 41, YELLOW);
box(9, 12, 0, 2, 37, 39, YELLOW);
box(10, 11, 0, 1, 36, 37, YELLOW);
put(10, 0, 36, YELLOW);
put(11, 0, 36, YELLOW);

eye(7, 2, 43);
eye(13, 2, 43);
brow(6, 10, 2, 45);
brow(12, 16, 2, 45);

// узор на лбу: ступеньки V + жёлтая сердцевина
put(10, 2, 46, TEAL);
put(11, 2, 46, TEAL);
put(9, 2, 47, TEAL);
put(12, 2, 47, TEAL);
put(10, 2, 47, YELLOW);
put(11, 2, 47, YELLOW);

// уши ступенькой
box(6, 8, 5, 9, 47, 48, WOOD);
box(6, 7, 6, 9, 49, 49, YELLOW);
put(6, 7, 49, TEAL);
box(13, 15, 5, 9, 47, 48, WOOD);
box(14, 15, 6, 9, 49, 49, YELLOW);
put(15, 7, 49, TEAL);

// медальоны на груди — два столбика по два квадрата
box(7, 8, 2, 2, 33, 34, YELLOW);
box(7, 8, 2, 2, 36, 37, YELLOW);
box(13, 14, 2, 2, 33, 34, YELLOW);
box(13, 14, 2, 2, 36, 37, YELLOW);

// --- крылья вниз: рама + красная панель + бахрома ---
function wing(x0: number, x1: number): void {
  box(x0, x1, 5, 10, 22, 45, WOOD);
  box(x0 + 1, x1 - 1, 6, 9, 24, 43, RED);
  for (let x = x0; x <= x1; x++) {
    const tip = (x - x0) % 2 === 0 ? RED : WHITE;
    box(x, x, 6, 8, 18, 21, tip);
  }
}
wing(0, 5);
wing(16, 21);

const voxels: VoxVoxel[] = [...cells.entries()].map(([key, color]) => {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z, color };
});

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/vox/totem.vox');
writeFileSync(out, encodeVox(SIZE, voxels, palette));
console.log(`wrote ${out} (${voxels.length} voxels, size ${SIZE.join('×')})`);
