---
name: project-routing
description: >-
  Карта знаний SculptureCraft. Открывать в начале любой задачи, чтобы выбрать
  один профильный skill и не читать все доки. Маршрутизатор, оглавление, какой
  SKILL.md открыть.
---

# Маршрутизатор

Прочитай **один** skill из таблицы. Длинный справочник — только если в skill написано «если не хватило».

| Задача | Skill |
| --- | --- |
| Что за проект, слои, запреты, куда не лезть | [architecture](../architecture/SKILL.md) |
| Числа: сетка, HP, игрок, арена, цвета, осколки | [config](../config/SKILL.md) |
| Фигура, каталог, `.vox`, сетка little/small/medium, леса, столик | [levels](../levels/SKILL.md) |
| Текстура мрамора, шейдер, осколки, модели, декорации | [scene](../scene/SKILL.md) |
| Ходьба, камера, pointer lock, присед, лестницы | [player-input](../player-input/SKILL.md) |
| Сетка вокселей, рейкаст, долбёжка, трещины, покраска | [voxels-chisel](../voxels-chisel/SKILL.md) |
| Состояния Game, пауза, сдача со стола, оценка, UI | [game-loop-ui](../game-loop-ui/SKILL.md) |
| Расстановка мебели, JSON-схемы, /editor.html | [layout-editor](../layout-editor/SKILL.md) |

Несколько зон в одном запросе — открой все нужные skills, не GDD целиком.

## Если не хватило

| Тема | Файл |
| --- | --- |
| Замысел и петля | `Agent/Documentation/GDD.md` |
| Почему так решили | `Agent/Documentation/TechPlan.md` |
| Таблица каждого числа | `Agent/Documentation/ConfigReference.md` |
| Рецепт фигуры и лесов | `Agent/Documentation/LevelAuthoring.md` |
| Рецепт моделей и текстур | `Agent/Documentation/SceneAuthoring.md` |
| Сборка с нуля (устарело в деталях) | `Agent/Documentation/ImplementationGuide.md` |

## Новый модуль

Новая зона → новая папка `Agent/skills/<имя>/SKILL.md` и одна строка в таблице выше. Длинные доки не переписывай, пока skill не упрётся в них.
