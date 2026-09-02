# SculptureCraft

Браузерный прототип шуточного симулятора скульптора: воксельная глыба мрамора, внутри скрытая форма, долбёжка удержанием ЛКМ.

Знания для агента — трехуровневые, всё в `Agent/`:

- [Оглавление](Agent/project.md) — что за проект, куда идти
- [Маршрутизатор](Agent/skills/project-routing/SKILL.md) — какой skill открыть
- [Skills](Agent/skills/) — карточки по зонам (конфиг, уровни, сцена, игрок, воксели, цикл)

Длинные справочники (GDD, техплан, рецепты) — [Agent/Documentation](Agent/Documentation/README.md), только если skill отослал.

## Отладка

В `npm run dev` по **Esc** в меню паузы есть блок «Отладка»: квадратики заказов 1–3, тумблер «Ваншот» (мрамор с одного касания) и кнопка «Оставить один воксель». После последней клетки мрамора фигура красится в цвета из `.vox`; «Работа принята» — со стола. В собранной версии блок отладки не монтируется.

## Запуск

```bash
npm install
npm run dev
```

Сборка и проверка:

```bash
npm run build
npm test
npm run lint
```

## GitHub Pages

Сборка с `main` уезжает через Actions: [rogovenko.github.io/VoxelSculpture](https://rogovenko.github.io/VoxelSculpture/). Редактор расстановки на сайт не попадает.

Один раз в репозитории: **Settings → Pages → Source: GitHub Actions**. Дальше достаточно пуша в `main` (или **Actions → GitHub Pages → Run workflow**).
