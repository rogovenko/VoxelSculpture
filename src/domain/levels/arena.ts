import { aabb, type Aabb } from '../Aabb';
import { DECOR } from './props';

export type ArenaBoxKind = 'floor' | 'wall' | 'ceiling' | 'structure' | 'ladder' | 'decor' | 'table';

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
  /** Отступ спавна от внутренней грани стены с дверью. */
  spawnFromDoor: number;
  /** Высота столика `little` в клетках. */
  tableVoxels: number;
  /** Выступ столешницы за глыбу с каждой стороны. */
  tableMargin: number;
}

/** Пол, стены, потолок и сквозной реквизит. Не зависят от заказа. */
export interface RoomLayout {
  boxes: ArenaBox[];
  bounds: Aabb;
}

/** То, что ставит уровень: леса, столик и куда встать у глыбы. */
export interface LevelStage {
  boxes: ArenaBox[];
  ladders: ArenaBox[];
  spawn: ArenaSpawn;
  walkTops: number[];
  glybaMin: [number, number, number];
  voxelSize: number;
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

/** Комната мастерской: один раз на сессию. */
export function createRoom(p: ArenaParams): RoomLayout {
  const a = p.halfExtent;
  const w = p.wallThickness;
  const boxes: ArenaBox[] = [];

  boxes.push(box('floor', -a, -p.plateThickness, -a, a, 0, a));

  boxes.push({ ...box('wall', a, -p.plateThickness, -a - w, a + w, p.wallTop, a + w), invisible: true });
  boxes.push({ ...box('wall', -a - w, -p.plateThickness, -a - w, -a, p.wallTop, a + w), invisible: true });
  boxes.push({ ...box('wall', -a, -p.plateThickness, a, a, p.wallTop, a + w), invisible: true });
  boxes.push({ ...box('wall', -a, -p.plateThickness, -a - w, a, p.wallTop, -a), invisible: true });
  boxes.push(box('ceiling', -a, p.wallTop, -a, a, p.wallTop + w, a));

  boxes.push(...DECOR);

  return {
    boxes,
    bounds: aabb(-a, -p.plateThickness, -a, a, p.wallTop, a),
  };
}

export interface StageKit {
  scaffolding: boolean;
  table: boolean;
}

/**
 * Глыба в раскладке не рисуется — её ставит уровень вокселями.
 * Здесь столик, леса и точка спавна относительно размера сетки.
 */
export function createLevelStage(
  gridSize: readonly [number, number, number],
  p: ArenaParams,
  voxelSize: number,
  kit: StageKit,
): LevelStage {
  const [sx, , sz] = gridSize;
  const gx = (sx * voxelSize) / 2;
  const gz = (sz * voxelSize) / 2;
  const boxes: ArenaBox[] = [];
  const ladders: ArenaBox[] = [];

  const tableHeight = kit.table ? p.tableVoxels * voxelSize : 0;
  if (kit.table) {
    const m = p.tableMargin;
    boxes.push(box('table', -gx - m, 0, -gz - m, gx + m, tableHeight, gz + m));
  }

  if (kit.scaffolding) {
    // Леса только с двух противоположных сторон: вместе они покрывают все столбцы глыбы,
    // потому что до дальней половины достаёшь с противоположных лесов.
    const deckHalfWidth = gx + p.deckMargin;
    const topDeck = Math.max(...p.deckTops);

    for (const side of [1, -1]) {
      const [deckZ0, deckZ1] = span(side * (gz + p.deckGap), side * (gz + p.deckGap + p.deckDepth));

      for (const top of p.deckTops) {
        boxes.push({
          ...box(
            'structure',
            -deckHalfWidth,
            top - p.plateThickness,
            deckZ0,
            deckHalfWidth,
            top,
            deckZ1,
          ),
          invisible: true,
        });
      }

      // Опоры-лестницы по бокам, буквой «П». Снаружи по ним взбираешься и шагаешь на
      // настил, изнутри подъём упирается в настил — с той стороны залезть нельзя.
      // Верх опоры совпадает с настилом, так что вся верхушка «П» — одна плоскость.
      for (const flank of [1, -1]) {
        const [ladderX0, ladderX1] = span(
          flank * deckHalfWidth,
          flank * (deckHalfWidth + p.ladderThickness),
        );
        ladders.push({
          ...box('ladder', ladderX0, 0, deckZ0, ladderX1, topDeck, deckZ1),
          invisible: true,
        });
      }
    }
  }

  const spawnZ = -(p.halfExtent - p.spawnFromDoor);

  return {
    boxes,
    ladders,
    // Юг, спиной к двери (−Z): смотришь на глыбу.
    spawn: { x: 0, y: 0, z: spawnZ, yawDeg: 180 },
    walkTops: kit.scaffolding ? [0, ...p.deckTops] : [0],
    glybaMin: [-gx, tableHeight, -gz],
    voxelSize,
  };
}

export function composeArena(room: RoomLayout, stage: LevelStage): ArenaLayout {
  return {
    boxes: [...room.boxes, ...stage.boxes],
    ladders: stage.ladders,
    bounds: room.bounds,
    spawn: stage.spawn,
    walkTops: stage.walkTops,
    glybaMin: stage.glybaMin,
    voxelSize: stage.voxelSize,
  };
}

/** Комната + сцена заказа. Для тестов и мест, где раскладка нужна целиком. */
export function createArena(
  gridSize: readonly [number, number, number],
  p: ArenaParams,
  voxelSize: number,
  scaffolding = true,
): ArenaLayout {
  return composeArena(
    createRoom(p),
    createLevelStage(gridSize, p, voxelSize, { scaffolding, table: false }),
  );
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
