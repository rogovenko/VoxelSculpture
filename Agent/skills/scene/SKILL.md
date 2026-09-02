---
name: scene
description: >-
  Внешний вид: текстура мрамора, шейдер глыбы, осколки, блок-аут, модели, декорации.
  Открывать при правке diorite.png, цветов осколков, света глыбы, GLB, props, каркаса прицела.
---

# Сцена

## Как устроено

Картинка и коллизия — **один** список коробок, но два слоя: комната (пол, стены, потолок, `DECOR`) живёт всю сессию; сцена заказа (леса / столик) пересобирается при смене `little`/`small`/`medium`. Модель ставится на невидимую коробку (`invisible: true`), не наоборот.

Пол — `Wood_01.png`, мировые UV, `arena.floorTile`; картинка шире коллизии на `floorOverhang`, чтобы за стенами и дверью не зияла пустота. Стены — модуль `SM_Bld_Base_Wall_01.fbx`, кольцо `wallTilesAlong × wallTilesUp`. Дверь — `SM_Bld_Base_Wall_Door_01.fbx`. Окна — `SM_Bld_Wall_Window_04.fbx` (стекло не перекрашивать). Потолок — `Concrete_Tex.png`, мировые UV, `arena.ceilingTile`, `MeshBasicMaterial` (Ламберт на нижней грани серел от грунта полусферы). Коробки стен `invisible`. Реквизит — схема `layouts/workshop.json` + `roomDecor.ts` + атлас `PolygonHorror_Texture_01_A.png`. Телевизор: слот 0 атлас, слот 1 чёрный экран. Коллизия считается в `layoutToDecor` (ковёр без неё). Правка поз — `http://localhost:5173/editor.html`.

Глыба — свой шейдер, свет сцены игнорирует. Свет глыбы: `uLightDir` в `voxelMaterial.ts`. Теней нет. Фон сцены (`colors.background`) — цвет неба, его видно в окна.

- Мрамор: `assets/images/diorite.png`, UV **мировые** (пара осей от нормали). Не на клетку — иначе плитка.
- Затемнения рёбер в шейдере **нет**. Обводка клетки — только `HighlightBox`.
- Скульптура без текстуры: зелёная, пока долбишь; после зачистки — RGB из `.vox`.
- Осколки: `colors.shard`, лёгкий emissive. Ламберт без пола 0.45 из шейдера глыбы делает их темнее камня.
- Столик `little`: дерево `Wood_01.png`, коробка из `createLevelStage`, тот же список что и коллизия.
- Письменный стол: `desk` в схеме — FBX стола, табурета и телефона одной группой плюс письмо (конверт и лист) и дневник (раскрытая книга и ручка), одна коллизия. Табурет чуть выдвинут; телефон справа на столешнице, письмо слева, дневник между ними. Смотришь в `interact.reach` — жёлтый каркас ближайшего реквизита (`AabbHighlight`). Письмо, дневник и телефон доминируют над столом. Снизу хинт. ЛКМ по телефону — магазин; по письму — «Прочитать ТЗ»; по дневнику — «Открыть дневник»; по столу — сдать работу; остальное — мысль.
- Плакаты: западная стена, `workshopPoster.ts`, без коллизии. Два слева от стола, два справа. Над столом — референс заказа из `assets/images/model_posters/<id>_poster.png`, текстура меняется при смене уровня. Взгляд на стену: inspire → controls | заказ | chisel → phone.

Единица сцены ≠ метр. Игрок `2.95` ≈ человек 1.8 м. Модель в метрах × 1.64.

## Куда смотреть

- `src/view/voxelMaterial.ts`, `VoxelRenderer.ts`, `ShardFX.ts`, `blockout.ts`, `roomWalls.ts`, `roomDecor.ts`, `workshopPoster.ts`, `HighlightBox.ts`, `AabbHighlight.ts`, `SceneRoot.ts`
- `assets/fbx/SM_Bld_Base_Wall_01.fbx`, `SM_Bld_Base_Wall_Door_01.fbx`, `SM_Bld_Wall_Window_04.fbx`, `assets/fbx/SM_Prop_Desk_01.fbx`, `SM_Prop_Stool_02.fbx`, `assets/fbx/Items/SM_Prop_Phone_Rotary_01.fbx`, `assets/fbx/decorations/SM_Prop_*.fbx`, `assets/images/decorations/Wood_01.png`, `Brick_Grey_Tex.png`, `Concrete_Tex.png`, `PolygonHorror_Texture_01_A.png`
- `src/domain/levels/props.ts` — декорации из JSON-схемы
- `src/editor/` — расстановка (`/editor.html` в dev)
- `src/app/Game.ts` — загрузка `diorite.png`
- Рецепты: `Agent/Documentation/SceneAuthoring.md`

## Порядок: пол / стены

1. Пол: подмени `Wood_01.png`, масштаб — `arena.floorTile`. Потолок: `Concrete_Tex.png`, масштаб — `arena.ceilingTile`.
2. Стены: другой модуль — путь в `roomWalls.ts`. Другой кирпич — тот же файл или импорт. Число плиток — `wallTilesAlong` / `wallTilesUp`.
3. Коробки стен в `createRoom` остаются, флаг `invisible`.

## Порядок: другая текстура мрамора

1. Положи файл в `assets/images/`.
2. Смени импорт в `Game.buildLevel()`.
3. `SRGBColorSpace`, `RepeatWrapping`. Масштаб — `uMarbleScale`.

## Порядок: декорация

1. Поза — в `layouts/*.json` (`collide: false`, если коллизия не нужна).
2. `npm test` — пересечения и досягаемость.
3. Модель ставит `roomDecor.ts` по той же схеме. Ковёр так и сделан без коллизии.

## Чеклист

- [ ] Нет второго списка геометрии
- [ ] Декорация не перекрыла оболочку глыбы и проход под настилом
- [ ] Коробки не пересекаются (касаться гранями можно)
- [ ] Свет лампы не «должен» менять глыбу — у неё свой шейдер
- [ ] Осколки красятся в `colors.shard`, не в `marble`
