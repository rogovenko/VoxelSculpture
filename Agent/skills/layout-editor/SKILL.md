---
name: layout-editor
description: >-
  Редактор расстановки мебели: isometric /editor.html, JSON-схемы, шаг сетки.
  Открывать когда двигают пропы, сохраняют workshop.json или чинят коллизию DECOR.
---

# Редактор расстановки

## Как устроено

Dev: `http://localhost:5173/editor.html`. В `vite build` страница не попадает.

Схема — JSON (`name` + `items`: `id`, `kind`, `x`, `z`, `yawDeg` 0/90/-90/180, `collide`). Текущая: `src/domain/levels/layouts/workshop.json`. Игра и редактор читают один формат. Коллизия — `layoutToDecor` (ковёр `collide: false`). `desk` — стол, табурет, телефон, письмо и дневник одной группой, одна коробка.

ЛКМ — выделить и тащить по XZ с шагом `arena.layoutSnap` (0.25). «Крутить 90°» или `R`. ПКМ — орбит, колесо — зум. Скачать / открыть JSON. После правки положи файл обратно в `layouts/` (браузер на диск репо не пишет).

## Куда смотреть

- `editor.html`, `src/editor/main.ts`, `LayoutEditor.ts`
- `src/domain/levels/layouts/workshop.json`, `furnitureCatalog.ts`, `layoutToDecor.ts`, `props.ts`
- `src/view/roomDecor.ts`, `furnitureKit.ts`

## Чеклист

- [ ] Предмет с `collide` есть в `DECOR`, без — нет (ковёр)
- [ ] Новый kind: строка в `furnitureCatalog.ts` + URL в `furnitureKit.ts` + item в `workshop.json`
- [ ] `npm.cmd test` — коробки не пересекаются, оболочка глыбы досягаема
- [ ] Повороты только прямые углы
