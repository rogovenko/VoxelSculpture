# SculptureCraft — оглавление для агента

Шуточный браузерный симулятор скульптора: глыба вокселей, внутри скрытая фигура, долбёжка удержанием ЛКМ. Стек: TypeScript, Vite, Three.js. Домен (`src/domain/`) не импортирует Three. Игровые числа только в `src/config.ts`.

**Не читай все доки подряд.** Открой маршрутизатор и один skill под задачу:

→ [skills/project-routing/SKILL.md](skills/project-routing/SKILL.md)

## Заказы

1. Лягушка (`little`, столик) — `assets/vox/frog.vox`
2. Птенец (`little`, столик) — `assets/vox/chick.vox`
3. Будда (`medium`, леса) — `assets/vox/buddha.vox`

Старт всегда с первого. После зачистки мрамора фигура красится из `.vox`; статистика и оплата — со стола, следующий заказ — с кровати.

## Команды

```
npm.cmd run dev    # PowerShell ломает npm.ps1
npm test
npm run build
```

Публикация: пуш в `main` → `.github/workflows/pages.yml` → GitHub Pages (`https://rogovenko.github.io/VoxelSculpture/`).

Тесты не добавляй, пока пользователь не попросил.

## Длинные справочники

Лежат в `Agent/Documentation/`. Skill на них ссылается, если не хватило карточки. Не начинай с ImplementationGuide — это сборка с нуля, не текущее состояние.
