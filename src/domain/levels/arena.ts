import { aabb, type Aabb } from '../Aabb';
import { DECOR } from './props';

export type ArenaBoxKind = 'floor' | 'structure' | 'ladder' | 'decor';

export interface ArenaBox extends Aabb {
  kind: ArenaBoxKind;
  /** Коробка участвует в коллизии, но блок-аут её не рисует: место занято моделью. */
  invisible?: boolean;
}

export interface ArenaSpawn {
  x: number;
  y: number;
  z: number;
  yawDeg: number;
}

export interface ArenaParams {
  halfExtent: number;
  deckTops: readonly number[];
  plateThickness: number;
  deckMargin: number;
  deckGap: number;
  deckDepth: number;
  ladderThickness: number;
  wallThickness: number;
  wallTop: number;
}

export interface ArenaLayout {
  /** Сплошная геометрия: одновременно и картинка, и коллизия, второго списка нет. */
  boxes: ArenaBox[];
  /** Боковые опоры лесов. Тоже сплошные, но дополнительно позволяют лазать. */
  ladders: ArenaBox[];
  bounds: Aabb;
  spawn: ArenaSpawn;
  /** Верх каждой ходовой поверхности, снизу вверх. */
  walkTops: number[];
  /** Мировая позиция клетки сетки (0, 0, 0). */
  glybaMin: [number, number, number];
  voxelSize: number;
}

function span(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export function createArena(
  gridSize: readonly [number, number, number],
  p: ArenaParams,
  voxelSize: number,
  /** На small-уровнях леса не ставятся: до всей глыбы достаёшь с земли. */
  scaffolding = true,
): ArenaLayout {
  const [sx, , sz] = gridSize;
  const gx = (sx * voxelSize) / 2;
  const gz = (sz * voxelSize) / 2;
  const a = p.halfExtent;

  const boxes: ArenaBox[] = [];
  const ladders: ArenaBox[] = [];

  boxes.push(box('floor', -a, -p.plateThickness, -a, a, 0, a));

  const w = p.wallThickness;
  boxes.push(box('structure', a, -p.plateThickness, -a - w, a + w, p.wallTop, a + w));
  boxes.push(box('structure', -a - w, -p.plateThickness, -a - w, -a, p.wallTop, a + w));
  boxes.push(box('structure', -a, -p.plateThickness, a, a, p.wallTop, a + w));
  boxes.push(box('structure', -a, -p.plateThickness, -a - w, a, p.wallTop, -a));

  if (scaffolding) {
    // Леса только с двух противоположных сторон: вместе они покрывают все столбцы глыбы,
    // потому что до дальней половины достаёшь с противоположных лесов.
    const deckHalfWidth = gx + p.deckMargin;
    const topDeck = Math.max(...p.deckTops);

    for (const side of [1, -1]) {
      const [deckZ0, deckZ1] = span(side * (gz + p.deckGap), side * (gz + p.deckGap + p.deckDepth));

      for (const top of p.deckTops) {
        boxes.push(
          box(
            'structure',
            -deckHalfWidth,
            top - p.plateThickness,
            deckZ0,
            deckHalfWidth,
            top,
            deckZ1,
          ),
        );
      }

      // Опоры-лестницы по бокам, буквой «П». Снаружи по ним взбираешься и шагаешь на
      // настил, изнутри подъём упирается в настил — с той стороны залезть нельзя.
      // Верх опоры совпадает с настилом, так что вся верхушка «П» — одна плоскость.
      for (const flank of [1, -1]) {
        const [ladderX0, ladderX1] = span(
          flank * deckHalfWidth,
          flank * (deckHalfWidth + p.ladderThickness),
        );
        ladders.push(box('ladder', ladderX0, 0, deckZ0, ladderX1, topDeck, deckZ1));
      }
    }
  }

  // Декорации идут в общий список: так они попадают и в коллизию, и в тесты досягаемости.
  boxes.push(...DECOR);

  const spawnZ = scaffolding ? gz + p.deckGap + p.deckDepth + 3 : gz + 3;

  return {
    boxes,
    ladders,
    bounds: aabb(-a, -p.plateThickness, -a, a, p.wallTop, a),
    spawn: { x: 0, y: 0, z: spawnZ, yawDeg: 0 },
    walkTops: scaffolding ? [0, ...p.deckTops] : [0],
    glybaMin: [-gx, 0, -gz],
    voxelSize,
  };
}

function box(
  kind: ArenaBoxKind,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): ArenaBox {
  return { kind, ...aabb(minX, minY, minZ, maxX, maxY, maxZ) };
}
