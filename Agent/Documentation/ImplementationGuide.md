# SculptureCraft — Пошаговое руководство по реализации, фазы 0–8

**Основание:** `GDD.md` (что делаем и зачем), `TechPlan.md` (архитектура и решения).
**Назначение этого документа:** исполняемая инструкция. Здесь нет обсуждений и альтернатив — только задачи, точные контракты и критерии проверки.
**Область:** фазы 0–8 как они собирались. Аудио (фаза 9) сюда не входит.
**Не сюда:** если проект уже собран и надо просто что-то поменять — правку чисел смотри в `ConfigReference.md`, фигуру и леса в `LevelAuthoring.md`, модели и текстуры в `SceneAuthoring.md`. Этот документ про сборку с нуля.

**Что в демке уже разошлось с текстом фаз** (смотри актуальные доки, не правь фазы задним числом):

- Утка грузится из `assets/vox/duck.vox` плагином Vite, не отдельным `vox2level.ts`.
- Затемнения рёбер в шейдере нет — клетку под прицелом рисует `HighlightBox`.
- Мрамор — `assets/images/diorite.png` по мировой UV.
- После последней клетки мрамора фигура красится в палитру `.vox`, повреждения остаются; оверлей оценки — по Esc.
- Осколки красятся в `colors.shard`, не в `colors.marble`.

---

## 0. Правила работы

Читай это перед каждой задачей.

1. **Одна задача за раз, в порядке номеров.** Не начинай `T3.2`, пока `T3.1` не проходит проверку.
2. **Не изобретай API.** Все имена файлов, классов, методов и полей заданы в этом документе. Если метода нет в контракте — он не нужен.
3. **Не добавляй зависимости**, которых нет в разделе 2. Никаких `OrbitControls`, физических движков, `lodash`, UI-фреймворков.
4. **Не рефактори чужие файлы.** Задача трогает только те файлы, которые в ней перечислены.
5. **Код, приведённый в этом документе блоками, переноси дословно.** Он написан так, чтобы работать. Не «улучшай» шейдеры и рейкаст.
6. **После каждой задачи выполняй её команды проверки.** Если проверка не прошла — исправляй, а не переходи дальше.
7. **Комментарии в коде — только там, где объясняют неочевидное ограничение.** Не пиши комментарии вида «создаём сцену».
8. **Все игровые числа живут только в `src/config.ts`.** Ни одной магической константы в логике.
9. **Слой `domain/` не импортирует `three`.** Никогда. Это проверяется в `T1.4`.
10. Если задача действительно невыполнима — оставь `// TODO(blocked): причина`, доведи остальное и сообщи, что заблокировано. Не выдумывай обходной путь молча.

Терминология: «сеточное пространство» — координаты, где воксель `(i,j,k)` занимает куб от `(i,j,k)` до `(i+1,j+1,k+1)`. «Мировое пространство» — координаты сцены Three.js.

---

## 1. Что должно получиться

Браузерная демка: серая арена, в ней воксельная глыба мрамора 14×14×24 в два человеческих роста, внутри спрятан крест. Камера от первого лица, наверх ведут леса с сиреневой лестницей, перекрестье в центре, удержание ЛКМ разрушает воксель под прицелом с нарастающими трещинами, осколки разлетаются, крест нельзя разрушить и он краснеет от попаданий. Когда мрамора не осталось — экран с оценкой и кнопкой «Заново».

---

## 2. Зависимости

Ставить строго пакетным менеджером, версии не прописывать руками.

```
npm install three
npm install -D typescript vite @types/three vitest eslint @eslint/js typescript-eslint prettier tweakpane stats.js
```

Если TypeScript начнёт жаловаться на дублирующиеся определения типов Three.js — удали `@types/three` (`npm uninstall @types/three`), значит текущая версия `three` поставляет типы сама.

---

## 3. Дерево файлов

`+` — создаётся в этой фазе. Файл создаётся ровно один раз и потом только дополняется.

```
index.html                       + T0.3
vite.config.ts                   + T0.2
tsconfig.json                    + T0.2
eslint.config.js                 + T0.2
.prettierrc                      + T0.2
.gitignore                       + T0.1
package.json                     + T0.1
README.md                        + T0.6
src/
  main.ts                        + T0.4
  config.ts                      + T0.5
  app/
    GameLoop.ts                  + T0.4
    Game.ts                      + T2.5
    InputController.ts           + T3.3
  domain/
    types.ts                     + T1.1
    VoxelGrid.ts                 + T1.2
    voxelRaycast.ts              + T4.1
    ChiselSystem.ts              + T5.1
    ScoreSystem.ts               + T7.2
    GameEvents.ts                + T1.5
    Aabb.ts                      + T3.1
    CollisionWorld.ts            + T3.1
    PlayerBody.ts                + T3.1
    levels/
      LevelData.ts               + T1.1
      arena.ts                   + T3.1
      shapeLevel.ts              + T1.3
      crossLevel.ts              + T1.3
      catalog.ts                 + T1.3
      props.ts                   + T3.1
  view/
    SceneRoot.ts                 + T2.1
    blockout.ts                  + T2.2
    crackAtlas.ts                + T5.2
    voxelMaterial.ts             + T2.3
    VoxelRenderer.ts             + T2.4
    HighlightBox.ts              + T4.3
    ShardFX.ts                   + T6.1
    PlayerCamera.ts              + T3.1
  ui/
    styles.css                   + T0.3
    Crosshair.ts                 + T3.2
    StartOverlay.ts              + T3.2
    WinOverlay.ts                + T7.3
    DebugMenu.ts                 + T8.1
  dev/
    DebugPanel.ts                + T8.1
tests/
  voxelGrid.test.ts              + T1.2
  crossLevel.test.ts             + T1.3
  noThreeInDomain.test.ts        + T1.4
  arena.test.ts                  + T3.1
  playerBody.test.ts             + T3.1
  voxelRaycast.test.ts           + T4.2
  chiselSystem.test.ts           + T5.4
  scoreSystem.test.ts            + T7.2
```

---

## ФАЗА 0 — Каркас проекта

### T0.1 — Репозиторий и package.json

Создай в корне `d:\CODE\SculptureCraft`:

1. `git init`.
2. `.gitignore` со строками: `node_modules/`, `dist/`, `.vite/`, `*.local`, `.DS_Store`.
3. `npm init -y`, затем в `package.json` выставь `"type": "module"`, `"private": true`, `"name": "sculpturecraft"` и скрипты:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

4. Установи зависимости из раздела 2.

**Проверка:** `node_modules` существует, `git status` работает, в `package.json` есть все шесть скриптов.

### T0.2 — Конфиги

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": false,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
);
```

`.prettierrc`:

```json
{ "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
```

**Проверка:** `npm run lint` завершается без ошибок конфигурации.

### T0.3 — index.html и базовые стили

`index.html` в корне:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SculptureCraft</title>
  </head>
  <body>
    <div id="app">
      <canvas id="scene"></canvas>
      <div id="ui"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/ui/styles.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
html,
body,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #101012;
}
body {
  font-family: system-ui, sans-serif;
  color: #eee;
}
#scene {
  display: block;
  width: 100%;
  height: 100%;
}
#ui {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
#ui > * {
  pointer-events: auto;
}
```

**Требование:** `#ui` не перехватывает мышь, иначе pointer lock и клики по канвасу сломаются. Только конкретные элементы внутри включают `pointer-events`.

### T0.4 — Игровой цикл и пустая сцена

`src/app/GameLoop.ts`:

```ts
export class GameLoop {
  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly maxDt: number,
    private readonly onFrame: (dt: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const tick = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, this.maxDt);
      this.lastTime = now;
      this.onFrame(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
```

Кламп `dt` обязателен: без него один кадр после переключения вкладки снесёт воксель мимо всех стадий трещин.

`src/main.ts` на этой фазе: импортирует `./ui/styles.css`, находит `#scene`, создаёт `WebGLRenderer`, `Scene`, `PerspectiveCamera`, обработчик `resize` (через `ResizeObserver` на канвасе или `window.addEventListener('resize', ...)`), запускает `GameLoop` с рендером кадра. Фон сцены — `0x101012`. `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

**Проверка:** `npm run dev` открывает страницу с тёмным канвасом на весь экран, без ошибок в консоли; изменение размера окна не растягивает картинку; `npm run build` проходит.

### T0.5 — config.ts

Единственное место со всеми числами. Создай `src/config.ts`:

```ts
/**
 * Сторона вокселя в мировых единицах. Масштаб сцены задаёт игрок, а не воксель:
 * его габариты и размеры арены живут в мире сами по себе. Поэтому сетку можно
 * дробить дальше — глыба останется того же размера, мельче станет только её зерно.
 */
const VOXEL = 0.25;

export const CONFIG = {
  loop: {
    maxDt: 1 / 30,
  },
  grid: {
    voxelSize: VOXEL,
    sizes: {
      small: [8, 12, 8] as [number, number, number],
      medium: [14, 24, 14] as [number, number, number],
    },
  },
  chisel: {
    dps: 2.5,
    /**
     * Прочность задана на клетку и при дроблении вокселя намеренно не уменьшена:
     * важнее сохранить ощущение «подержал и отколол» у отдельной клетки со всеми
     * стадиями трещин. Плата — полная зачистка мелкой сетки идёт в разы дольше,
     * см. TechPlan §3.2: рычаг против этого — AOE-резец, а не правка чисел.
     */
    marbleHp: 1.0,
    sculptureHp: 1.4,
    crackStages: 8,
    /** Мировые единицы. Верх глыбы намеренно не достаётся с земли — за этим нужны леса. */
    reach: 3,
  },
  camera: {
    fovWork: 75,
    fovPulled: 100,
    pitchMinDeg: -88,
    pitchMaxDeg: 88,
    sensitivity: 0.0022,
    lerpSpeed: 10,
    kickStrength: 0.04,
    kickDecay: 12,
  },
  player: {
    // Габариты в мировых единицах и от разрешения сетки не зависят: это игрок задаёт
    // масштаб, а не наоборот. Числа чуть меньше круглых — ровно вплотную проход был бы
    // на грани погрешности, и выдолбленный точно в рост коридор не пропускал бы игрока.
    width: 0.95,
    height: 2.95,
    eyeHeight: 2.7,
    walkSpeed: 4.6,
    accel: 18,
    gravity: 28,
    jumpSpeed: 8,
    /**
     * Тоже мировая величина: шаг определяется длиной ноги, а не зерном сетки.
     * По нынешнему вокселю это чуть больше двух клеток.
     */
    stepHeight: 0.525,
    maxFallSpeed: 40,
    climbSpeed: 2.4,
    crouchScale: 0.5,
  },
  arena: {
    halfExtent: 12,
    /**
     * Верх настилов лесов. Настил всего один: под ним нужно оставить полный рост
     * игрока, иначе к нижней части глыбы с земли не подойти.
     */
    deckTops: [3.5],
    plateThickness: 0.25,
    /** Насколько настил шире глыбы с каждой стороны. */
    deckMargin: 0.5,
    /** Зазор между гранью глыбы и настилом: леса стоят рядом, а не вплотную. */
    deckGap: 0.5,
    /** Глубина прохода по настилу. */
    deckDepth: 1.5,
    ladderThickness: 0.3,
    wallThickness: 0.5,
    wallTop: 12,
  },
  shards: {
    poolSize: 240,
    perBreak: 8,
    /** Осколок — обломок клетки, поэтому мельчает вместе с ней. */
    size: 0.44 * VOXEL,
    speedMin: 3,
    speedMax: 7,
    gravity: 14,
    lifeMin: 0.4,
    lifeMax: 0.8,
    dustPerHit: 4,
  },
  colors: {
    marble: 0xd9d6cf,
    sculpture: 0x3fa64f,
    sculptureMid: 0xc9b83a,
    sculptureRuined: 0xb03030,
    blockout: 0x6b6b6f,
    floor: 0x3a3a3e,
    ladder: 0xb478e0,
    background: 0x101012,
  },
  crackAtlas: {
    tileSize: 64,
    seed: 1337,
  },
} as const;
```

Комментарий к числам: `dps: 2.5` и `marbleHp: 1.0` дают слом клетки за 0.4 с — это канон §11 GDD и трогать его нельзя. А вот полная зачистка сетки `14×14×24` при этих числах занимает уже десятки минут, то есть в заявленные §11 GDD 1–3 минуты сессия не укладывается: прочность сознательно не пересчитана по объёму клетки. Это известный долг, разбор и список рычагов — в `TechPlan.md` §3.2.

### T0.6 — README

Короткий README: что это, `npm install`, `npm run dev`, `npm run build`, `npm test`, ссылка на `Agent/Documentation/GDD.md` и `TechPlan.md`.

**Приёмка фазы 0:** `npm run dev`, `npm run build`, `npm test`, `npm run lint` — все четыре команды работают. На экране пустой тёмный канвас.

---

## ФАЗА 1 — Доменный слой сетки

Вся фаза 1 — чистый TypeScript. Ни одного импорта `three`.

### T1.1 — types.ts и LevelData.ts

`src/domain/types.ts`:

```ts
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
```

`src/domain/levels/LevelData.ts`:

```ts
export type MaterialName = 'marble' | 'sculpture';

export interface LevelData {
  version: 1;
  name: string;
  size: [number, number, number];
  /** индекс палитры MagicaVoxel -> семантика игры */
  materials: Record<number, MaterialName>;
  /** упакованные четвёрки x, y, z, paletteIndex */
  voxels: Int32Array;
}

export function validateLevelData(data: LevelData): void {
  // бросай Error с внятным текстом при: version !== 1; любом размере <= 0;
  // voxels.length % 4 !== 0; координате вне размеров; paletteIndex, которого нет в materials.
}
```

Реализуй `validateLevelData` полностью — это единственная защита от битого уровня, когда на фазе 10 появится конвертер `.vox`.

### T1.2 — VoxelGrid

`src/domain/VoxelGrid.ts`. Контракт ровно такой:

```ts
export class VoxelGrid {
  readonly size: readonly [number, number, number];
  readonly type: Uint8Array;
  readonly hp: Float32Array;
  readonly maxHp: Float32Array;

  marbleRemaining: number;
  marbleDestroyed: number;
  readonly sculptureTotal: number;

  static fromLevelData(data: LevelData, marbleHp: number, sculptureHp: number): VoxelGrid;

  indexOf(x: number, y: number, z: number): number;
  inBounds(x: number, y: number, z: number): boolean;
  typeAt(x: number, y: number, z: number): VoxelTypeValue;
  isSolid(x: number, y: number, z: number): boolean;
  coordsOf(index: number): [number, number, number];
  removeAt(index: number): void;
  hasAirNeighbour(x: number, y: number, z: number): boolean;
}
```

Правила реализации:

- Индекс: `x + y * sx + z * sx * sy`. Не меняй формулу — от неё зависят все остальные файлы.
- `type`, `hp`, `maxHp` создаются длиной `sx * sy * sz` и заполняются из `LevelData`. Клетки, которых нет в `voxels`, остаются `Air` с `hp = 0`.
- `removeAt` работает **только** для `Marble`: ставит `Air`, обнуляет `hp`, уменьшает `marbleRemaining`, увеличивает `marbleDestroyed`. Для любого другого типа — ничего не делает (не бросает исключение).
- `inBounds` возвращает `false` за границами, `typeAt` за границами возвращает `Air`.
- `hasAirNeighbour` проверяет 6 ортогональных соседей; выход за границу сетки считается воздухом.

`tests/voxelGrid.test.ts` — минимум эти случаи:

1. `indexOf` и `coordsOf` взаимно обратны на нескольких точках, включая углы.
2. `inBounds` ложен для `-1` и для `size` по каждой оси.
3. `typeAt` за границей возвращает `Air`.
4. `removeAt` мраморной клетки уменьшает `marbleRemaining` на 1 и увеличивает `marbleDestroyed` на 1.
5. `removeAt` клетки скульптуры не меняет ни тип, ни счётчики.
6. `hasAirNeighbour` истинен для клетки на поверхности глыбы и ложен для клетки внутри.

### T1.3 — Генератор креста

`src/domain/levels/crossLevel.ts`:

```ts
export function createCrossLevel(size: [number, number, number]): LevelData;
```

Форма задаётся **долями габарита**, а не числом клеток, иначе она зависит от разрешения сетки: те же «3 клетки в ширину» на вдвое мельче вокселе дали бы вместо креста спицу. Доли взяты из исходных `7×12×7`, поэтому на той сетке раскладка совпадает с задокументированной ниже клетка в клетку.

Логика для размера `[sx, sy, sz]`:

1. Все клетки внутри объёма — `paletteIndex 1` (мрамор).
2. Отступы считает одна функция `inset(fraction, extent)`, одинаковая с двух сторон: так симметрия фигуры не зависит от округления.
3. Вертикальная часть креста: по `x` и `z` отступ `2/7` габарита, по `y` — `2/12` снизу и сверху.
4. Перекладина: по `x` отступ `1/7`, по `z` та же глубина, что у вертикали, по `y` — от `1/2` до `2/3` высоты.
5. Все клетки креста получают `paletteIndex 2`.
6. `materials: { 1: 'marble', 2: 'sculpture' }`.

Для `7×12×7` это даёт: вертикаль `x 2..4`, `z 2..4`, `y 2..9`; перекладина `x 1..5`, `z 2..4`, `y 6..7`. Для рабочих `14×24×14` всё ровно вдвое: вертикаль `x 4..9`, `y 4..19`; перекладина `x 2..11`, `y 12..15`. В обоих случаях крест со всех сторон закрыт мрамором, и толщина этого слоя в мире одинакова.

`tests/crossLevel.test.ts`:

1. Уровень проходит `validateLevelData`.
2. Число клеток равно `sx * sy * sz` (сплошной объём, воздуха на старте нет).
3. Форма симметрична относительно центра по X и по Z.
4. **Ни одна клетка скульптуры не имеет соседа-воздуха и не лежит на границе объёма** — иначе нарушено требование §4.1 GDD «снаружи виден только светлый камень». Проверяй через `VoxelGrid.hasAirNeighbour` и через сравнение координат с границами.
5. Тот же тест проходит для размера `[9, 9, 16]`.

### T1.4 — Тест чистоты домена

`tests/noThreeInDomain.test.ts`: рекурсивно прочитай все `.ts` файлы в `src/domain` через `node:fs` и убедись, что ни в одном нет подстроки `from 'three'` и `require('three')`. Тест должен падать с указанием конкретного файла.

Это не формальность: как только `three` протечёт в домен, тесты перестанут запускаться без браузера.

### T1.5 — Шина событий

`src/domain/GameEvents.ts` — минимальный типизированный emitter, без внешних зависимостей:

```ts
export interface GameEventMap {
  targetChanged: { hit: HitResult | null };
  voxelDamaged: { hit: HitResult; hpNormalized: number; stage: number };
  voxelDestroyed: { x: number; y: number; z: number; face: Face };
  sculptureHit: { x: number; y: number; z: number; hpNormalized: number };
  sculptureRuined: { x: number; y: number; z: number };
  levelCompleted: Record<string, never>;
}

export class GameEvents {
  on<K extends keyof GameEventMap>(key: K, fn: (payload: GameEventMap[K]) => void): () => void;
  emit<K extends keyof GameEventMap>(key: K, payload: GameEventMap[K]): void;
  clear(): void;
}
```

`on` возвращает функцию отписки. `clear` нужен для рестарта.

**Приёмка фазы 1:** `npm test` — все тесты зелёные. `npm run build` проходит.

---

## ФАЗА 2 — Рендер блок-аута

### T2.1 — SceneRoot

`src/view/SceneRoot.ts` — класс, владеющий рендерером, сценой и камерой. Забирает из `main.ts` то, что было создано в `T0.4`.

```ts
export class SceneRoot {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  constructor(canvas: HTMLCanvasElement);
  resize(): void;
  render(): void;
  dispose(): void;
}
```

Свет: `HemisphereLight(0xffffff, 0x404048, 0.7)` и `DirectionalLight(0xffffff, 0.8)` в позиции `(1, 2, 1.5)`. Тени **не включать** (`castShadow` нигде). Этот свет нужен только для коробок блок-аута — воксели освещаются своим шейдером.

### T2.2 — Блок-аут арены

`src/view/blockout.ts`:

```ts
export function createBlockout(arena: ArenaLayout): THREE.Group;
```

По мешу на каждую коробку из `arena.boxes` **и** `arena.ladders`, `MeshLambertMaterial` цветом по `kind`: `colors.floor`, `colors.blockout`, `colors.ladder`.

Сиреневая лестница — единственное исключение из «всё серое»: это единственная геометрия арены, с которой игрок взаимодействует, и без цвета её не найти (§6.1 GDD).

Своих констант геометрии здесь **нет**: раскладка приходит из `createArena` (T3.1), потому что тот же список используется как коллизия. Если завести здесь второй набор размеров, картинка и физика разъедутся при первой правке.

Больше ничего. Никаких колонн, табличек, скайбокса, деталей на лесах — §4.1 GDD разрешает только серые коробки ради досягаемости и коллизии.

### T2.3 — Материал вокселя

`src/view/voxelMaterial.ts`. **Перенеси шейдеры дословно.** Это самое хрупкое место проекта.

```ts
import * as THREE from 'three';
import { CONFIG } from '../config';

const VERTEX = /* glsl */ `
attribute float aType;
attribute float aDamage;
attribute float aStage;

varying vec2 vUv;
varying vec3 vNormal;
varying float vType;
varying float vDamage;
varying float vStage;

void main() {
  vUv = uv;
  vType = aType;
  vDamage = aDamage;
  vStage = aStage;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uCrackAtlas;
uniform float uCrackStages;
uniform vec3 uMarbleColor;
uniform vec3 uSculptureColor;
uniform vec3 uSculptureMid;
uniform vec3 uSculptureRuined;
uniform vec3 uLightDir;
uniform float uHasAtlas;

varying vec2 vUv;
varying vec3 vNormal;
varying float vType;
varying float vDamage;
varying float vStage;

void main() {
  vec3 base;
  if (vType > 1.5) {
    vec3 c = mix(uSculptureColor, uSculptureMid, clamp(vDamage * 2.0, 0.0, 1.0));
    base = mix(c, uSculptureRuined, clamp((vDamage - 0.5) * 2.0, 0.0, 1.0));
  } else {
    base = uMarbleColor;
  }

  vec2 d = min(vUv, vec2(1.0) - vUv);
  float edge = smoothstep(0.0, 0.055, min(d.x, d.y));
  base *= mix(0.5, 1.0, edge);

  if (uHasAtlas > 0.5 && vStage >= 0.0) {
    float u = (vUv.x + vStage) / uCrackStages;
    float crack = texture2D(uCrackAtlas, vec2(u, vUv.y)).r;
    base *= mix(1.0, 0.2, crack);
  }

  float ndl = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
  gl_FragColor = vec4(base * (0.45 + 0.55 * ndl), 1.0);

  #include <colorspace_fragment>
}
`;

export function createVoxelMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uCrackAtlas: { value: null },
      uCrackStages: { value: CONFIG.chisel.crackStages },
      uMarbleColor: { value: new THREE.Color(CONFIG.colors.marble) },
      uSculptureColor: { value: new THREE.Color(CONFIG.colors.sculpture) },
      uSculptureMid: { value: new THREE.Color(CONFIG.colors.sculptureMid) },
      uSculptureRuined: { value: new THREE.Color(CONFIG.colors.sculptureRuined) },
      uLightDir: { value: new THREE.Vector3(0.6, 1.0, 0.45).normalize() },
      uHasAtlas: { value: 0 },
    },
  });
}
```

Важные оговорки, чтобы не сломать шейдер:

- `position`, `normal`, `uv`, `instanceMatrix`, `modelMatrix`, `viewMatrix`, `projectionMatrix` объявляет сам Three.js для `ShaderMaterial`. **Не объявляй их повторно** — получишь ошибку компиляции.
- Порядок умножения `modelMatrix * instanceMatrix * position` менять нельзя.
- `#include <colorspace_fragment>` обязателен и должен идти **после** записи в `gl_FragColor`, иначе цвета будут пересвечены.
- `aStage = -1` означает «трещин нет». `uHasAtlas` держится в 0 до фазы 5, поэтому на фазе 2 блок трещин не выполняется и атлас не нужен.

### T2.4 — VoxelRenderer

`src/view/VoxelRenderer.ts`. Контракт:

```ts
export class VoxelRenderer {
  readonly object: THREE.Group;
  constructor(grid: VoxelGrid);
  setCrackAtlas(texture: THREE.Texture): void;
  removeVoxel(voxelIndex: number): void;
  setDamage(voxelIndex: number, damage01: number, stage: number): void;
  dispose(): void;
}
```

Реализация:

- `BoxGeometry(1, 1, 1)` + `InstancedMesh` с `maxCount = число непустых клеток`.
- Три `InstancedBufferAttribute` длиной `maxCount`, itemSize 1: `aType`, `aDamage`, `aStage`. Начальные значения: тип клетки, `0`, `-1`.
- `object` — `THREE.Group` с мешем. Внутри группы координаты остаются **целыми клетками**: центр вокселя `(i,j,k)` находится в `(i + 0.5, j + 0.5, k + 0.5)`. Мировой масштаб и позицию задаёт владелец (`Game` ставит `scale = arena.voxelSize`, `position = arena.glybaMin`) — рендерер не знает раскладку арены.
- Из-за масштаба группы всё, что должно жить в мировых единицах, в неё класть **нельзя**: осколки добавляются в сцену, иначе уменьшатся вместе с вокселями. Подсветка целевой клетки, наоборот, живёт внутри — ей нужно совпадать с вокселем.
- `mesh.frustumCulled = false` — bounding sphere у `InstancedMesh` с ручным `instanceCount` считается неверно и глыба может пропадать с экрана.

Удаление через swap-remove, дословно:

```ts
removeVoxel(voxelIndex: number): void {
  const slot = this.slotOfVoxel[voxelIndex];
  if (slot < 0) return;
  const last = this.count - 1;

  if (slot !== last) {
    this.mesh.getMatrixAt(last, this.tmpMatrix);
    this.mesh.setMatrixAt(slot, this.tmpMatrix);
    this.aType.array[slot] = this.aType.array[last];
    this.aDamage.array[slot] = this.aDamage.array[last];
    this.aStage.array[slot] = this.aStage.array[last];

    const movedVoxel = this.voxelOfSlot[last];
    this.voxelOfSlot[slot] = movedVoxel;
    this.slotOfVoxel[movedVoxel] = slot;
  }

  this.slotOfVoxel[voxelIndex] = -1;
  this.voxelOfSlot[last] = -1;
  this.count = last;
  this.mesh.count = this.count;
  this.mesh.instanceMatrix.needsUpdate = true;
  this.aType.needsUpdate = true;
  this.aDamage.needsUpdate = true;
  this.aStage.needsUpdate = true;
}
```

`slotOfVoxel` — `Int32Array` длиной во всю сетку, заполненный `-1`. `voxelOfSlot` — `Int32Array` длиной `maxCount`. Без этих двух карт после первого же удаления трещины начнут появляться не на той клетке.

`dispose()` вызывает `dispose()` у геометрии, материала и текстуры атласа.

### T2.5 — Game и сборка сцены

`src/app/Game.ts` — владелец всего. На этой фазе:

```ts
export class Game {
  constructor(canvas: HTMLCanvasElement, ui: HTMLElement);
  start(): void;
  dispose(): void;
}
```

Внутри: `SceneRoot`, `GameEvents`, `createArena(CONFIG.grid.size, CONFIG.arena, CONFIG.grid.voxelSize)`, `VoxelGrid.fromLevelData(createCrossLevel(CONFIG.grid.size), ...)`, `VoxelRenderer` (группе задаётся `scale = arena.voxelSize` и `position = arena.glybaMin`), `createBlockout(arena)`. Камера пока статичная — поставь её в `(10, 8, 10)` и `lookAt` в центр глыбы.

`src/main.ts` сокращается до: импорт стилей, поиск `#scene` и `#ui`, создание `Game`, `game.start()`.

**Приёмка фазы 2:** на экране серая воксельная глыба прямо на полу, вокруг — пол, стены и леса из серых коробок с сиреневыми лестницами. Зелёного не видно ни с какого ракурса. Рёбра отдельных клеток различимы за счёт затемнения по краям граней. В консоли нет ошибок компиляции шейдера. `renderer.info.render.calls` не больше 5.

---

## ФАЗА 3 — Перемещение, камера и ввод

Изначально в этой фазе был орбитальный `CameraRig`. После первой игровой сборки канон §6.1 GDD сменён на камеру от первого лица, потому что целиться орбитой неудобно. Ниже — актуальная схема.

### T3.1 — Арена, тело игрока и камера

**Раскладка арены — данные.** `src/domain/levels/arena.ts`:

```ts
export function createArena(gridSize, params: ArenaParams, voxelSize: number): ArenaLayout;
```

`ArenaLayout` содержит `boxes` (коробки с полем `kind`), `ladders` (тоже сплошные, но по ним можно лазать), `bounds`, `spawn`, `walkTops`, `glybaMin` и `voxelSize`. По обоим спискам строится и картинка, и коллизия. **Второго списка геометрии быть не должно:** они разъедутся при первой правке, и игрок начнёт застревать в воздухе или проваливаться сквозь пол.

Что в раскладке: пол на `y = 0`, глыба стоит прямо на нём (цоколя нет), стены по периметру и **леса с двух противоположных сторон** глыбы, отставленные от неё на `deckGap`. На `small`-уровнях лесов нет.

Каждые леса — буква «П»: один настил (`structure`) и две боковые опоры-лестницы (`ladder`) по его краям по X, от пола до `deckTop`. Настил цельный, проёмов в нём нет — подъём идёт снаружи опор, а не сквозь настил.

Что связано жёстко:

- **Проём под настилом** — `deckTops[0] - plateThickness` должно быть больше роста игрока, иначе к низу глыбы не подойти. Именно поэтому настил один: второй ярус на удобной высоте перекрыл бы проход под первым.
- **Верх опоры равен верху настила** — вся верхушка «П» получается одной плоскостью, и с последнего шага подъёма игрок оказывается ровно на её уровне. Держит его при этом растянутый вниз `LADDER_GRIP` в `CollisionWorld`: без него хват теряется именно там, где нужен.
- **Досягаемость оболочки** — см. ниже.

**Лестница сплошная.** `ladders` участвует в коллизии наравне с `boxes` — сквозь лестницу не пройти. Отдельный список нужен только ради второй роли: касание лестницы отключает гравитацию. Рисуется цветом `colors.ladder` (сиреневый) — единственная цветная геометрия арены, потому что единственная интерактивная.

**Подъём работает только снаружи, и это не проверка в коде, а геометрия.** Снаружи опоры подъём свободен и заканчивается шагом на настил; изнутри, из-под настила, он упирается в настил снизу. Условия «с какой стороны игрок» писать не надо — на углах оно бы всё равно врало.

**Инвариант досягаемости.** Высота настила, высота глаз, размер вокселя и дальность руки связаны арифметикой, и с лесами лишь с двух сторон задача перестаёт быть одномерной: часть верхней грани достаётся только с противоположных лесов. `tests/arena.test.ts` проверяет и покрытие слоёв по вертикали, и досягаемость всей внешней оболочки глыбы из позиций, где игрок физически может стоять. Долбёжка идёт вглубь, то есть всегда ближе, поэтому оболочки достаточно. Если инвариант сломан, победа не срабатывает никогда, а игрок не понимает почему.

**Физика.** `src/domain/Aabb.ts` — коробка и пересечение (касание гранями пересечением **не** считается, иначе стоять на полу нельзя). `src/domain/CollisionWorld.ts` — запрос «занято ли»: статика арены **и лестницы** плюс воксели через `VoxelGrid.isSolid`, с пересчётом мировых координат в сеточные по `arena.glybaMin` и `arena.voxelSize`. Отдельно `onLadder(box)`: раздувает запрос на `LADDER_GRIP` по горизонтали, потому что в сплошную лестницу тело не попадает и проверять надо касание.

`src/domain/PlayerBody.ts`:

```ts
export class PlayerBody {
  x: number;
  y: number;
  z: number; // центр по горизонтали, ноги по вертикали
  grounded: boolean;
  climbing: boolean;
  get eyeY(): number;
  teleport(x: number, y: number, z: number): void;
  update(dt: number, intent: MoveIntent, world: CollisionWorld): void;
}
```

Правила:

- Горизонтальная скорость — цель из `MoveIntent`, повёрнутая на `yaw`: `forward = (-sin yaw, -cos yaw)`, `right = (cos yaw, -sin yaw)`. Диагональ нормализуется, иначе по диагонали игрок быстрее.
- Прыжок только при `grounded`. Гравитация с ограничением скорости падения.
- **Лестница проверяется до перемещения:** если тело касается лестницы, гравитация и прыжок отключаются, а `vy` берётся прямо из ввода — `forward` вверх, `crouch` вниз, ничего не нажато — ноль. Горизонтальное движение остаётся рабочим, иначе с лестницы не шагнуть на настил; оно же на подъёме прижимает игрока к лестнице и держит хват.
- Движение разрешается **по осям раздельно**: Y, затем X, затем Z. Пересечение ищется бисекцией по 12 шагам — одна процедура работает и по вокселям, и по коробкам арены, аналитика для двух разных представлений не нужна.
- Шаг на уступ: если по горизонтали упёрлись и стоим на земле, приподнимаемся на `stepHeight`, повторяем то же движение и сдуваемся вниз. Если приподнятая попытка не дала выигрыша — откат. Так уступ ниже `stepHeight` берётся бесплатно, а выше — невозможен. В клетках порог зависит от разрешения сетки: `stepHeight` мировой.
- `grounded` определяется пробой вниз на 0.02 после всех перемещений, а не результатом развёртки: бисекция оставляет микрозазор.

`src/view/PlayerCamera.ts` — глаз, `look(dx, dy)`, `setPulledBack`, `kick`, `update(dt, eyeX, eyeY, eyeZ)`, `rayOrigin`, `rayDirection`. Порядок Эйлера обязательно `YXZ`, иначе при тангаже кренится горизонт. ПКМ расширяет FOV вместо отъезда — от ног игрока отъезжать некуда (§12.2 GDD).

### T3.2 — Стартовый оверлей и перекрестье

`src/ui/Crosshair.ts` — создаёт div в центре экрана: две перекрещённые линии, белые с чёрной обводкой (`box-shadow: 0 0 0 1px #000`), размер 18 px, `pointer-events: none`. Контрастное и простое, как требует §6.2 GDD.

`src/ui/StartOverlay.ts`:

```ts
export class StartOverlay {
  constructor(root: HTMLElement, onStart: () => void);
  show(text?: string): void;
  hide(): void;
  destroy(): void;
}
```

Полупрозрачная подложка, заголовок «SculptureCraft», строка управления («WASD — ходить, Space — прыжок, C — присесть, W у лестницы — подъём, Shift — спуск, мышь — обзор, ЛКМ — долбить, ПКМ — шире обзор»), кнопка «Начать». Кнопка вызывает `onStart`. Оверлей переиспользуется для паузы, поэтому `show` принимает необязательный текст кнопки/заголовка.

Стили добавляй в `src/ui/styles.css`, инлайновых стилей в TS не пиши.

### T3.3 — InputController

`src/app/InputController.ts`:

```ts
export interface InputCallbacks {
  onOrbit: (dx: number, dy: number) => void;
  onChiselStart: () => void;
  onChiselStop: () => void;
  onPullBack: (pulled: boolean) => void;
  onPause: () => void;
}

export class InputController {
  constructor(canvas: HTMLCanvasElement, cb: InputCallbacks);
  requestLock(): void;
  get isLocked(): boolean;
  get isChiseling(): boolean;
  get movement(): MoveInput;
  dispose(): void;
}
```

Обязательное поведение:

1. `requestLock()` вызывает `canvas.requestPointerLock()`.
2. `mousemove` вызывает `onLook` если `isLocked`. Заморозки обзора при зажатой ЛКМ **нет**: от первого лица взгляд и прицел — одно и то же, и невозможность повернуть голову во время долбёжки ломает управление (см. §12.2 GDD с историей правки).
3. `mousedown` кнопка 0 → `isChiseling = true`, `onChiselStart()`. Кнопка 2 → `onPullBack(true)`.
4. `mouseup` кнопка 0 → `isChiseling = false`, `onChiselStop()`. Кнопка 2 → `onPullBack(false)`.
5. `contextmenu` → `preventDefault()`. Без этого ПКМ откроет меню браузера и §6.1 GDD не работает.
6. `keydown`/`keyup` копят набор нажатых кодов (WASD, стрелки, Space, Shift, C). `movement` собирает из него `forward`, `strafe`, `jump`, `crouch` и `climbDown`. Клавиши обрабатываются только при `isLocked`. Отдельной кнопки лазания нет: подъём по лестнице делает то же «вперёд», что и ходьбу, спуск — Shift. C — присед (`crouchScale`), встать нельзя если над головой геометрия.
7. Слушатель `pointerlockchange`: при **потере** блокировки сбрось все кнопки **и набор клавиш**, вызови `onChiselStop()` и `onPullBack(false)`, затем `onPause()`. Без сброса игра застрянет в состоянии «ЛКМ зажата» после alt-tab, а с зажатой W игрок будет идти на паузе.
8. Все слушатели снимаются в `dispose()`.

Esc обрабатывать вручную не нужно — браузер сам выйдет из pointer lock, и сработает пункт 7.

### T3.4 — Склейка в Game

В `Game` добавь состояния `'start' | 'playing' | 'paused'`, `arena`, `CollisionWorld`, `PlayerBody`, `PlayerCamera`, `InputController`, `Crosshair`, `StartOverlay`. Кнопка «Начать» → `requestLock()` → состояние `playing`, оверлей скрыт, перекрестье показано. `onPause` → состояние `paused`, оверлей показан с текстом «Продолжить», перекрестье скрыто.

В `playing` каждый кадр: собрать `MoveIntent` из `input.movement` и `playerCamera.yaw` → `playerBody.update` → `playerCamera.update` из глаза тела. **Порядок важен:** камера обновляется до рейкаста, иначе цель берётся из взгляда прошлого кадра.

Группа вокселей ставится в `arena.glybaMin` с масштабом `arena.voxelSize`; та же пара чисел переводит луч камеры в сеточное пространство.

**Приёмка фазы 3:** курсор захватывается по кнопке «Начать»; обзор мышью работает всегда, включая долбёжку; WASD везёт относительно взгляда, Space прыгает только с опоры; уступ ниже высоты шага берётся автоматически, выше — нет; в щель или коридор в один воксель игрок не просачивается; снаружи опоры лесов «вперёд» поднимает и на верхушке само выводит на настил, Shift опускает, без ввода игрок висит; изнутри, из-под настила, подъём упирается в настил; сквозь лестницу не пройти; под настилом лесов проходишь не пригибаясь; в мрамор и скульптуру войти нельзя, встать на них можно; в выдолбленную в свой рост полость войти можно; за арену не выйти и в пустоту не упасть; ПКМ плавно расширяет FOV и возвращает; ПКМ не открывает контекстное меню; Esc ставит на паузу, курсор возвращается, и игрок не продолжает идти; повторное «Продолжить» работает.

---

## ФАЗА 4 — Рейкаст и подсветка

### T4.1 — voxelRaycast

`src/domain/voxelRaycast.ts`. **Перенеси код дословно.** Алгоритм Amanatides–Woo, ошибиться в инициализации `tMax` очень легко.

```ts
import { VoxelType, type Face, type HitResult, type SolidVoxelType } from './types';
import type { VoxelGrid } from './VoxelGrid';

const EPS = 1e-9;

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * origin и dir заданы в СЕТОЧНОМ пространстве: воксель (i,j,k) занимает [i,i+1]x[j,j+1]x[k,k+1].
 * dir обязан быть нормализован.
 * face — грань найденного вокселя, через которую в него вошёл луч.
 */
export function raycastVoxels(
  grid: VoxelGrid,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDistance: number,
): HitResult | null {
  const [sx, sy, sz] = grid.size;

  let tEnter = 0;
  let tExit = maxDistance;
  let entryFace: Face = 'py';

  const slab = (o: number, d: number, limit: number, faceLow: Face, faceHigh: Face): boolean => {
    if (Math.abs(d) < EPS) {
      return o >= 0 && o <= limit;
    }
    const inv = 1 / d;
    let t0 = (0 - o) * inv;
    let t1 = (limit - o) * inv;
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      entryFace = d > 0 ? faceLow : faceHigh;
    }
    if (t1 < tExit) tExit = t1;
    return tEnter <= tExit;
  };

  if (!slab(ox, dx, sx, 'nx', 'px')) return null;
  if (!slab(oy, dy, sy, 'ny', 'py')) return null;
  if (!slab(oz, dz, sz, 'nz', 'pz')) return null;
  if (tEnter > tExit) return null;

  let t = tEnter + 1e-5;
  if (t > maxDistance) return null;

  const px = ox + dx * t;
  const py = oy + dy * t;
  const pz = oz + dz * t;

  let x = clampInt(Math.floor(px), 0, sx - 1);
  let y = clampInt(Math.floor(py), 0, sy - 1);
  let z = clampInt(Math.floor(pz), 0, sz - 1);

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const tDeltaX = Math.abs(dx) < EPS ? Infinity : Math.abs(1 / dx);
  const tDeltaY = Math.abs(dy) < EPS ? Infinity : Math.abs(1 / dy);
  const tDeltaZ = Math.abs(dz) < EPS ? Infinity : Math.abs(1 / dz);

  let tMaxX = Math.abs(dx) < EPS ? Infinity : dx > 0 ? t + (x + 1 - px) / dx : t + (x - px) / dx;
  let tMaxY = Math.abs(dy) < EPS ? Infinity : dy > 0 ? t + (y + 1 - py) / dy : t + (y - py) / dy;
  let tMaxZ = Math.abs(dz) < EPS ? Infinity : dz > 0 ? t + (z + 1 - pz) / dz : t + (z - pz) / dz;

  // аннотация обязательна: без неё TS сузит тип до литерала 'py' и присваивания ниже не скомпилируются
  let face: Face = entryFace;

  while (t <= maxDistance) {
    const index = grid.indexOf(x, y, z);
    const type = grid.type[index];
    if (type !== VoxelType.Air) {
      return { x, y, z, index, type: type as SolidVoxelType, face, distance: t };
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
      face = stepX > 0 ? 'nx' : 'px';
      if (x < 0 || x >= sx) return null;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      face = stepY > 0 ? 'ny' : 'py';
      if (y < 0 || y >= sy) return null;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      face = stepZ > 0 ? 'nz' : 'pz';
      if (z < 0 || z >= sz) return null;
    }
  }

  return null;
}
```

### T4.2 — Тесты рейкаста

`tests/voxelRaycast.test.ts`. Строй маленькие сетки руками (например 3×3×3) через `LevelData`, чтобы ожидаемый результат считался в голове.

Обязательные случаи:

1. Луч снаружи вдоль +X в центр сетки попадает в клетку с наименьшим `x`, `face === 'nx'`.
2. Тот же луч вдоль −X даёт `face === 'px'` и максимальный `x`.
3. Аналогично для осей Y и Z, все четыре знака.
4. Луч мимо сетки возвращает `null`.
5. Луч, стартующий **внутри** сетки, находит клетку старта.
6. После `removeAt` первых двух клеток на пути луч находит третью — пролёт сквозь выдолбленное (§7.1 GDD).
7. `maxDistance` меньше расстояния до сетки → `null`.
8. Диагональный луч попадает в существующую клетку, а не в `null` и не за границы.
9. Луч точно по границе между клетками возвращает валидный результат в границах сетки (не бросает, не даёт `x = -1`).

### T4.3 — HighlightBox

`src/view/HighlightBox.ts`:

```ts
export class HighlightBox {
  readonly object: THREE.LineSegments;
  constructor();
  showAt(x: number, y: number, z: number): void;
  hide(): void;
  dispose(): void;
}
```

`EdgesGeometry(new BoxGeometry(1, 1, 1))`, `LineBasicMaterial({ color: 0x000000 })`, `object.scale.setScalar(1.002)`, `material.polygonOffset = true`, `polygonOffsetFactor = -1`. `showAt` ставит позицию в `(x + 0.5, y + 0.5, z + 0.5)` и `visible = true`.

`object` добавляется **внутрь группы `VoxelRenderer.object`**, чтобы координаты совпадали с сеточными без пересчёта.

### T4.4 — Наведение в Game

Каждый кадр в состоянии `playing`:

1. Взять `rayOrigin()` и `rayDirection()`.
2. Перевести origin в сеточное пространство: вычесть `arena.glybaMin` и поделить на `arena.voxelSize`. Направление не трогать — масштаб равномерный, направление от него не меняется.
3. Вызвать `raycastVoxels` с `CONFIG.chisel.reach / arena.voxelSize`: дальность руки задана в мировых единицах, а рейкаст считает в клетках.
4. Результат → `highlightBox.showAt(...)` или `hide()`.
5. Если целевая клетка изменилась — `events.emit('targetChanged', { hit })`.

Храни текущую цель как `index` предыдущего кадра, а не как объект — сравнение по `index` дешевле и надёжнее.

**Приёмка фазы 4:** тесты зелёные; чёрная рамка мгновенно следует за прицелом; исчезает при наведении в пустоту; появляется на зелёных клетках тоже (§6.3 GDD); после разрушения клеток рамка корректно ловит клетки за ними.

---

## ФАЗА 5 — Долбёжка, HP и трещины

### T5.1 — ChiselSystem

`src/domain/ChiselSystem.ts`. Ядро игры, поэтому поведение задано жёстко.

```ts
export class ChiselSystem {
  constructor(
    private readonly grid: VoxelGrid,
    private readonly events: GameEvents,
    private readonly dps: number,
    private readonly crackStages: number,
  );

  /** true, если удержание активно */
  get active(): boolean;

  begin(): void;
  stop(): void;
  /** вызывать каждый кадр, hit — результат рейкаста этого кадра */
  update(dt: number, hit: HitResult | null): void;
  reset(): void;
}
```

Поведение:

1. `begin()` ставит `active = true`, `stop()` — `active = false`. Больше `stop()` не делает **ничего**: урон необратим (§6.2 GDD, `TechPlan.md` §3.1).
2. `update` при `!active` или `hit === null` просто выходит.
3. Текущая цель нигде не хранится — сравнивать её не с чем и откатывать нечего. Это единственная причина, по которой раньше в системе было состояние; теперь её нет.
4. Вычесть урон: `grid.hp[index] -= dps * dt`.
5. Стадия трещин: `stage = floor((1 - hp / maxHp) * crackStages)`, кламп в `[0, crackStages - 1]`. При `hp === maxHp` стадия `-1`.
6. Событие `voxelDamaged` эмитится каждый кадр, когда идёт урон.
7. При `hp <= 0`:
   - **мрамор**: `grid.removeAt(index)`, событие `voxelDestroyed` с координатами и гранью. Затем, если `grid.marbleRemaining === 0`, эмитить `levelCompleted`;
   - **скульптура**: `hp` зажимается в 0, клетка **остаётся** (§7.2 GDD), стадия трещин снимается в `-1` (клетка «добита»), эмитится `sculptureRuined` один раз для этой клетки. Дальнейшие удары ничего не меняют.
8. Для скульптуры при каждом кадре урона эмитить `sculptureHit` с `hpNormalized` — на это подпишутся пыль и цвет.
9. `reset()` полностью обнуляет состояние — для рестарта уровня.

Держи флаг «эта клетка скульптуры уже добита» в `Uint8Array` или проверяй `hp <= 0` перед нанесением урона — важно, чтобы `sculptureRuined` не эмитился каждый кадр.

### T5.2 — Атлас трещин

`src/view/crackAtlas.ts`:

```ts
export function createCrackAtlas(stages: number, tileSize: number, seed: number): THREE.Texture;
```

Реализация:

1. `<canvas>` размером `stages * tileSize` × `tileSize`.
2. Залить чёрным.
3. Детерминированный ПСЧ (простой LCG на `seed`) — стадии должны быть одинаковыми между запусками, иначе отладка невозможна.
4. Рисовать **накопительно**: линии стадии `n` включают все линии стадий `< n`. Для этого сгенерируй список ломаных заранее, каждой присвой номер стадии появления, и для каждого тайла `n` рисуй все ломаные с номером `<= n`.
5. Ломаная: старт в случайной точке ближе к центру тайла, 3–6 сегментов случайного направления с небольшим разбросом угла, длина сегмента `tileSize / 6`. Цвет белый, `lineWidth` от 1 до 2.5 растёт со стадией. Всего примерно `stages * 2` ломаных.
6. Клипуй рисование в границы своего тайла (`ctx.save(); ctx.beginPath(); ctx.rect(...); ctx.clip();`), иначе трещины протекут в соседнюю стадию.
7. Из канваса — `THREE.CanvasTexture` с `magFilter = minFilter = THREE.NearestFilter`, `wrapS = wrapT = ClampToEdgeWrapping`, `colorSpace` не менять (читаем красный канал как данные, не как цвет).

**Как проверить визуально:** временно выведи канвас в DOM или сохрани как data URL. Стадия 0 — почти чистая, последняя — плотная сетка трещин. Это соответствует §7.4 GDD.

### T5.3 — Подключение трещин к рендеру

1. В `Game` создай атлас и передай в `voxelRenderer.setCrackAtlas(...)`, который проставит `uCrackAtlas` и `uHasAtlas = 1`.
2. Подпишись на `voxelDamaged` → `voxelRenderer.setDamage(hit.index, 1 - hpNormalized, stage)`.
3. Подпишись на `voxelDestroyed` → `voxelRenderer.removeVoxel(index)`.
4. Подпишись на `sculptureHit` → `setDamage` с `damage01 = 1 - hpNormalized` для градиента §12.3 GDD.
5. `setDamage` пишет в `aDamage` и `aStage` по слоту клетки и ставит `needsUpdate = true` только этим двум атрибутам.

Порядок важен: `removeVoxel` вызывается **после** того, как домен уже удалил клетку, а `setDamage` для удалённой клетки вызываться не должен — слот уже занят другой клеткой.

### T5.4 — Тесты долбёжки

`tests/chiselSystem.test.ts`, обязательные случаи:

1. Удержание на мраморной клетке уменьшает HP на `dps * dt`.
2. Клетка разрушается примерно за `maxHp / dps` секунд (сумма шагов `dt`).
3. `stop()` **сохраняет** нанесённый урон мраморной клетке — необратимость §6.2 GDD.
4. Урон **накапливается** между отдельными удержаниями по одной и той же клетке.
5. Смена цели сохраняет урон прежней мраморной клетки.
6. `hit === null` при активном удержании сохраняет урон.
7. Клетка скульптуры **не удаляется** при `hp <= 0`, тип остаётся `Sculpture`.
8. `sculptureRuined` эмитится ровно один раз для клетки, даже если продолжать бить.
9. `levelCompleted` эмитится в тот момент, когда удалена последняя мраморная клетка.
10. Стадия трещин монотонно растёт от 0 до `crackStages - 1` и не выходит за границы.

**Приёмка фазы 5:** удержание ЛКМ даёт нарастающие трещины и слом примерно за 0.4 с; трещины переживают и отпускание, и смену цели (§6.2 GDD); зелёная клетка от удара желтеет, потом краснеет и остаётся на месте; на месте разрушенных клеток открываются соседи. **После этой задачи кор игры проверяем — сыграй сам и оцени ощущение.**

---

## ФАЗА 6 — Осколки и фидбек удара

### T6.1 — ShardFX

`src/view/ShardFX.ts`:

```ts
export class ShardFX {
  readonly object: THREE.Object3D;
  constructor();
  /** Координаты — центр клетки в мировом пространстве, не в сеточном. */
  burst(cx: number, cy: number, cz: number, face: Face): void;
  dust(cx: number, cy: number, cz: number): void;
  update(dt: number): void;
  dispose(): void;
}
```

Реализация:

- Один `InstancedMesh` кубиков размера `CONFIG.shards.size` на `poolSize` инстансов. Материал — обычный `MeshLambertMaterial` цвета мрамора. Пул, а не создание объектов: аллокации в момент слома дадут микрофризы.
- Параллельные массивы `Float32Array`: позиция, скорость, время жизни, полное время жизни, активность. Индекс свободного слота ищи по кольцевому счётчику — если свободных нет, перезаписывай самый старый.
- `burst` спавнит `perBreak` осколков в центре клетки со скоростью: базовое направление — наружу по нормали грани `face`, плюс случайный конус, плюс небольшая составляющая вверх. Скорость случайна в `[speedMin, speedMax]`.
- `update` интегрирует `v.y -= gravity * dt`, `pos += v * dt`, уменьшает время жизни. Масштаб инстанса уходит от 1 к 0 по остатку жизни. Отработавшие слоты получают нулевую матрицу.
- Осколки **не сталкиваются ни с чем** и не отскакивают от пола — §7.5 GDD: «физика осколков не геймплей».
- `dust` — 3–4 частицы вдвое меньшего размера с малой скоростью, без разлёта. Это удар по оригиналу (§7.5 GDD).

В отличие от `HighlightBox`, `object` добавляется **прямо в сцену**, а не в группу `VoxelRenderer.object`: группа отмасштабирована по размеру вокселя, и внутри неё вместе с осколками уехали бы и разлёт, и скорость, и гравитация. Размер осколка мельчает вместе с клеткой, но делает это своим параметром (`shards.size`), а скорость и время жизни остаются мировыми. Цена — `Game` переводит координаты клетки в мировые (`glybaMin + (cell + 0.5) * voxelSize`) перед вызовом. Разлёт точек спавна внутри `ShardFX` тоже пропорционален размеру вокселя, иначе осколки рождаются заметно снаружи разбитой клетки.

### T6.2 — Подключение и отдача камеры

1. `voxelDestroyed` → `shardFX.burst(...)` по центру клетки в мировых координатах и `playerCamera.kick()`.
2. `sculptureHit` → `shardFX.dust(...)`, но **не каждый кадр**: ставь троттлинг ~10 раз в секунду, иначе пыль зальёт кадр.
3. `shardFX.update(dt)` в игровом цикле — в том числе в состоянии `paused` вызывать **не** нужно.

**Приёмка фазы 6:** кусок читается как отколовшийся, а не исчезнувший; осколки уходят наружу и вниз и пропадают за 0.4–0.8 с; при быстрой долбёжке кадр не засоряется и прицеливаться не мешает; удар по зелёному даёт скромную пыль без разлёта; отдача камеры едва заметна.

---

## ФАЗА 7 — Победа, оценка, рестарт

### T7.1 — Таймер

В `Game`: поле `firstHitTime: number | null`. Ставится при первом же событии `voxelDamaged` или `sculptureHit`. Время работы = `now - firstHitTime`. Это решение открытого вопроса §15.2 GDD — таймер с первого попадания, а не с загрузки сцены.

### T7.2 — ScoreSystem

`src/domain/ScoreSystem.ts`:

```ts
export interface ScoreResult {
  marbleDestroyed: number;
  marbleTotal: number;
  sculptureTotal: number;
  /** клетки оригинала, доведённые до нуля HP */
  sculptureRuined: number;
  /** средняя доля потерянного HP по всем клеткам оригинала, 0..1 */
  sculptureDamageAvg: number;
  timeSeconds: number;
  verdict: string;
}

export function computeScore(
  grid: VoxelGrid,
  marbleTotal: number,
  timeSeconds: number,
): ScoreResult;
```

Вердикт по шкале §8.3 GDD, границы по доле добитых клеток `ruined / sculptureTotal`:

| Доля      | Вердикт                                   |
| --------- | ----------------------------------------- |
| `= 0`     | «Микеланджело нервно курит в стороне»     |
| `<= 0.15` | «Музей возьмёт, но реставратор проклянёт» |
| `< 1.0`   | «Это уже современное искусство»           |
| `= 1.0`   | «Крест получился. Эмоционально»           |

`tests/scoreSystem.test.ts`: по одному тесту на каждую границу шкалы плюс тест, что `sculptureDamageAvg` учитывает частичный урон (клетка с половиной HP даёт 0.5, а не 0) — это требование §8.2 и §12.3 GDD.

### T7.3 — WinOverlay

`src/ui/WinOverlay.ts`:

```ts
export class WinOverlay {
  constructor(root: HTMLElement, onRestart: () => void);
  show(score: ScoreResult): void;
  hide(): void;
  destroy(): void;
}
```

Содержимое: заголовок «Работа принята», три метрики (повреждение оригинала — доля добитых клеток и средний урон в процентах; снято мрамора — `N` блоков; время — мм:сс), вердикт крупным текстом, кнопка «Заново». Тон текста шуточно-музейный, как просит §12.1 GDD, но без клоунады.

### T7.4 — Рестарт

При `levelCompleted`: выйти из pointer lock, состояние `'win'`, `chisel.stop()`, показать `WinOverlay` с результатом.

Кнопка «Заново» вызывает метод `Game.restartLevel()`, который:

1. `events.clear()` и заново подписывает всех слушателей.
2. `voxelRenderer.dispose()`, удаление его группы из сцены.
3. Новый `VoxelGrid` из `createCrossLevel`, новый `VoxelRenderer` с `HighlightBox` внутри его группы и новый `ShardFX` — в сцене, а не в группе (T2.4).
4. `chisel.reset()`, `firstHitTime = null`, счётчики обнулены.
5. Скрыть `WinOverlay`, запросить pointer lock, состояние `playing`.

**Не перезагружай страницу** — рестарт должен быть мгновенным, и заодно это проверяет отсутствие утечек.

**Приёмка фазы 7:** победа срабатывает точно в момент удаления последней мраморной клетки; цифры на экране соответствуют реальной игре; вердикт меняется в зависимости от того, бил ли игрок по зелёному; после трёх рестартов `renderer.info.memory.geometries` и `.textures` не растут.

---

## ФАЗА 8 — Тюнинг и сочность

### T8.1 — DebugPanel

`src/dev/DebugPanel.ts` на Tweakpane, создаётся **только** при `import.meta.env.DEV`.

Параметры, которые обязаны меняться без пересборки: `dps`, `marbleHp`, `sculptureHp`, `crackStages`, `reach`, камера (`fovWork`, `fovPulled`, `sensitivity`), игрок (`walkSpeed`, `jumpSpeed`, `gravity`, `stepHeight`, `climbSpeed`), параметры осколков (`perBreak`, `speedMin`, `speedMax`, `gravity`, `lifeMin`, `lifeMax`), `kickStrength`.

Осторожно с `reach`, `voxelSize`, габаритами игрока и `deckTops`: они связаны инвариантом досягаемости и просветом под настилом (T3.1). Уменьшив `reach`, можно молча сделать верх глыбы недостижимым, и победа перестанет срабатывать; увеличив рост игрока — закрыть проход под лесами. Перед фиксацией значений в `config.ts` прогони `tests/arena.test.ts`.

Плюс кнопки: «Рестарт уровня», «Показать/скрыть stats.js».

**Часть отладки уже сделана и живёт не здесь.** Тумблер «Ваншот» и кнопка «Оставить один воксель» встроены в меню паузы (`src/ui/DebugMenu.ts`, монтируется в `StartOverlay` только при `import.meta.env.DEV`). Они закрывают самую частую нужду — быстро дойти до победного экрана — и не требуют Tweakpane. Не дублируй их в панели; описание для пользователя — в `ConfigReference.md`, раздел «Отладка».

Технически: `CONFIG` объявлен `as const`, поэтому для правки в рантайме сделай в `Game` изменяемую копию игровых параметров (`this.params = structuredClone(CONFIG)` без `as const`-типизации) и передавай в системы её, а не сам `CONFIG`. Изменение `crackStages` требует пересоздания атласа — повесь на него колбэк.

### T8.2 — stats.js

Панель FPS в углу, только в DEV. Один вызов `begin()`/`end()` вокруг тела кадра.

### T8.3 — Балансный проход

Сыграй полную сессию и подкрути через панель:

1. **Время слома одной клетки** — 0.4–0.8 с. Это канон §11 GDD и первый по важности параметр: `dps` выше 4 не поднимай, удержание превратится в «один тап».
2. **Время сессии** в 1–3 минуты (§11 GDD) на сетке `14×14×24` при этом недостижимо — расхождение известное и записано в §11 GDD и `TechPlan.md` §3.2. Не пытайся закрыть его делением `marbleHp` на объём клетки: это ровно то, от чего отказались, слом уедет в 0.05 с. Если длина сессии на фазе 8 окажется невыносимой, вариант один — AOE-резец из §12.7 GDD, и это отдельная задача, а не тюнинг.
3. **Читаемость трещин**: за время слома должно смениться минимум 4 различимые стадии.
4. **HP скульптуры** — такое, чтобы игрок успел понять ошибку и отпустить, то есть заметно больше мрамора, но не бесконечное.
5. **Углы обзора**: рабочий — крупный план, обзорный по ПКМ — вся глыба в кадре (§11 GDD).
6. **Лазание по лестнице** (`climbSpeed`): подъём на настил не должен ощущаться дольше пары секунд, иначе игрок начнёт избегать верха глыбы.
7. **Чувствительность мыши** — чтобы прицеливание в отдельную клетку не раздражало.

Финальные значения **перенеси в `src/config.ts`** и запиши в конце этого раздела, какие числа изменились относительно исходных.

### T8.4 — Финальная полировка

1. Опциональный тонкий индикатор прогресса удара под перекрестьем (§9 GDD) — добавляй **только** если после T8.3 окажется, что трещин недостаточно.
2. Проверь читаемость глыбы: если серый монолит всё ещё сливается, усиль затемнение рёбер (константа `0.5` в `mix(0.5, 1.0, edge)` в шейдере) — но не добавляй тени.
3. Убедись, что при наведении на зелёную клетку это заметно до удара (рамка есть, цвет контрастный) — §4.2 GDD требует, чтобы игрок понимал, куда бить нельзя.
4. `npm run lint` и `npm run build` чистые, `npm test` зелёный.

**Приёмка фазы 8:** демка играется от начала до победы без перезагрузки страницы, все числа настраиваемы, сессия в целевом окне времени.

---

## 9. Типовые поломки и что с ними делать

| Симптом                                             | Причина                                                        | Что делать                                                    |
| --------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Чёрный экран, в консоли ошибка компиляции шейдера   | Повторно объявлены `position`/`normal`/`uv`/`instanceMatrix`   | Убрать свои объявления, их даёт Three.js для `ShaderMaterial` |
| Глыба видна, но белая/пересвеченная                 | Забыт `#include <colorspace_fragment>`                         | Добавить после `gl_FragColor`                                 |
| Глыба исчезает при повороте камеры                  | Неверный bounding sphere `InstancedMesh`                       | `mesh.frustumCulled = false`                                  |
| Трещины появляются на другой клетке                 | Не обновлены карты `slotOfVoxel`/`voxelOfSlot` при swap-remove | Сверить код `removeVoxel` с T2.4 дословно                     |
| Трещины «мигают» между стадиями                     | Стадии рисуются не накопительно                                | В `crackAtlas` рисовать все ломаные с номером `<= n`          |
| Рамка подсветки мерцает по рёбрам                   | Z-fighting                                                     | `scale 1.002` + `polygonOffset`, см. T4.3                     |
| ПКМ открывает меню браузера                         | Нет `preventDefault` на `contextmenu`                          | T3.3 пункт 5                                                  |
| После alt-tab долбёжка идёт сама                    | Не сброшены кнопки при потере pointer lock                     | T3.3 пункт 6                                                  |
| Воксель исчезает без стадий трещин                  | Не заклампен `dt`                                              | `GameLoop` с `maxDt`, T0.4                                    |
| Рейкаст даёт `x = -1` или уходит в бесконечный цикл | Отступ от границы или инициализация `tMax`                     | Перенести `voxelRaycast` дословно из T4.1                     |
| Тесты падают с ошибкой импорта WebGL                | В `domain/` протёк `three`                                     | Тест T1.4 покажет файл                                        |
| Память растёт с каждым рестартом                    | Не вызван `dispose()`                                          | T7.4 пункт 2                                                  |

---

## 10. Итоговый чеклист демки

- [ ] Серый блок-аут: пол, стены, леса с сиреневыми лестницами, глыба 14×14×24 со скрытым крестом прямо на полу.
- [ ] Камера от первого лица: WASD, прыжок, шаг на воксель, лазание по лестнице, коллизия, расширение FOV по ПКМ.
- [ ] Pointer lock по кнопке «Начать», пауза по Esc, корректное возобновление.
- [ ] Перекрестье в центре, рейкаст по сетке, чёрный каркас целевой клетки.
- [ ] Удержание ЛКМ: нарастающие трещины, слом за 0.4–0.8 с, урон сохраняется после отпускания.
- [ ] Оригинал не удаляется, накапливает урон, красится зелёный → жёлтый → алый.
- [ ] Осколки при сломе мрамора, пыль при ударе по оригиналу, слабая отдача камеры.
- [ ] Победа при нулевом остатке мрамора, экран с тремя метриками и вердиктом, рабочий рестарт.
- [ ] Все игровые числа в `config.ts`, дев-панель их меняет в рантайме.
- [ ] `npm run build`, `npm test`, `npm run lint` — чисто. Стабильные 60 fps.
